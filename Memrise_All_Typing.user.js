// ==UserScript==
// @name           Memrise All Typing
// @namespace      https://github.com/cooljingle
// @description    All typing / no multiple choice when doing Memrise typing courses
// @match          https://www.memrise.com/course/*/garden/*
// @match          https://www.memrise.com/garden/review/*
// @match          https://app.memrise.com/course/*/garden/*
// @match          https://app.memrise.com/garden/review/*
// @match          https://decks.memrise.com/course/*/garden/*
// @match          https://decks.memrise.com/garden/review/*
// @version        0.2.0
// @updateURL      https://github.com/cooljingle/memrise-all-typing/raw/master/Memrise_All_Typing.user.js
// @downloadURL    https://github.com/cooljingle/memrise-all-typing/raw/master/Memrise_All_Typing.user.js
// @grant          none
// ==/UserScript==

$(document).ready(function() {

    //*****************************************************************************************************************************************************
    //MEMRISE ALL TYPING
    //-----------------------------------------------------------------------------------------------------------------------------------------------------
    // This userscript prevents multiple choice from occuring, replacing it with a typing prompt.
    // You can configure the extent to which this happens by clicking the 'All Typing Settings' link on the left when in a learning session.
    // Changes you make will be saved locally on your machine.
    //*****************************************************************************************************************************************************

    var localStorageIdentifier = "memrise-all-typing",
        localStorageObject = JSON.parse(localStorage.getItem(localStorageIdentifier)) || {};

    $("body").append(
            `
                <div class='modal fade' id='all-typing-modal' tabindex='-1' role='dialog'>
                    <div class='modal-dialog' role='document'>
                        <div class='modal-content'>
                            <div class='modal-header'>
                                <button type='button' class='close' data-dismiss='modal'><span >×</span></button>
                                <h1 class='modal-title' id='all-typing-modal-label'>All Typing Settings</h1>
                            </div>
                            <div class='modal-body'>
                                <div>
                                    <input class='all-typing-setting' id='include-reviews' type='checkbox'>
                                    <label for='include-reviews'>Include Reviews</label>
                                    <em style='font-size:85%'>only typing on old items you are reviewing</em>
                                </div>
                                <div>
                                    <input class='all-typing-setting' id='include-learning' type='checkbox'>
                                    <label for='include-learning'>Include Learning</label>
                                    <em style='font-size:85%'>only typing on new items you are learning</em>
                                </div>
                                <div>
                                    <input class='all-typing-setting' id='replace-tapping' type='checkbox'>
                                    <label for='replace-tapping'>Replace Tapping</label>
                                    <em style='font-size:85%'>tapping tests will be converted to typing (along with multiple choice)</em>
                                </div>
                                <div>
                                    <input class='all-typing-setting' id='replace-audio-multiple-choice' type='checkbox'>
                                    <label for='replace-audio-multiple-choice'>Replace Audio Multiple Choice</label>
                                    <em style='font-size:85%'>audio multiple choice tests will be converted to typing (along with multiple choice)</em>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `);

    $('#left-area').append("<a data-toggle='modal' data-target='#all-typing-modal'>All Typing Settings</a>");

    $('#all-typing-modal').on('shown.bs.modal', function() {
        $(document).off('focusin.modal'); //enable focus events on modal
    });

    $('.all-typing-setting')
        .prop('checked', function(){ return localStorageObject[$(this).attr('id')] !== false; }) //all options true by default
        .css({
            "vertical-align": "top",
            "float": "left",
            "margin-right": "5px"
        })
        .change(function(e){
            localStorageObject[e.target.id] = $(this).is(':checked');
            localStorage.setItem(localStorageIdentifier, JSON.stringify(localStorageObject));
            console.log(localStorageObject);
        });

    MEMRISE.garden._events.start.push(() => {
        addTypingOverrides();
        MEMRISE.garden.populateScreens();
    });

    function addTypingOverrides() {
        MEMRISE.garden.session.box_factory.make = (function() {
            var cached_function = MEMRISE.garden.session.box_factory.make;
            return function() {
                var result = cached_function.apply(this, arguments);
                if (arguments[0].learn_session_level) {
                    if(localStorageObject["include-learning"] !== false) {
                        makeMaybeTyping(result);
                    }
                } else if(localStorageObject["include-reviews"] !== false) {
                    makeMaybeTyping(result);
                }
                return result;
            };
        }());
    }

    function makeMaybeTyping(box) {
        if (box.template === "multiple_choice" ||
            box.template === "reversed_multiple_choice" ||
            (localStorageObject["replace-tapping"] !== false && box.template === "tapping") ||
            (localStorageObject["replace-audio-multiple-choice"] !== false && box.template === "audio-multiple-choice")) {
            var boxCopy = jQuery.extend({}, box);
            box.template = MEMRISE.garden.session.box_factory.makeMaybeTyping(boxCopy).template;
        }
    }

    MEMRISE.garden.populateScreens = function() {
        _.each(MEMRISE.garden.learnables || _.indexBy(MEMRISE.garden.session_data.learnables, 'learnable_id'), function(v, k) {
            var learnableScreensNew = (MEMRISE.garden.screens || MEMRISE.garden.session_data.screens)[k];
            var learnableScreens = _.reduce(learnableScreensNew, (x, v, k) => {x[v.template] = v; return x;}, {});
            if(learnableScreens && !_.contains(Object.keys(learnableScreens), "typing")) {
                var screenBase = _.find([learnableScreens.multiple_choice, learnableScreens.reversed_multiple_choice], s => s.answer.kind === "text");
                var column = _.find([v.item, v.definition], c => c.kind === "text");
                if(screenBase) {
                    var typingScreen = $.extend({}, screenBase, {
                        template: "typing",
                        choices: "",
                        correct: _.uniq(_.flatten(_.map([column.value, ...column.alternatives, ...(learnableScreens.tapping ? _.map(learnableScreens.tapping.correct, t => t.join(" ")) : [])], function(y) {
                            return _.isArray(y) ? y : [y, _.map([..._.compact(y.split(/[();]+/)), y], function(x) { //bracket/semicolon delimitation
                                return x.replace(/\./g, " ") //full stops are treated like spaces to memrise
                                    .replace(/[\u00a0\u00A0]/g, " ") //sinister no-break spaces!
                                    .replace(XRegExp('[\\p{P}\\p{S}\\p{C}\u064B-\u065B]+', 'g'), "") //strip punctuation
                                    .replace(/\s{2,}/g, " ") //clear multiple spaces (e.g. from "a ... b")
                                    .trim() // trim spaces at beginning and end
                                    .toLowerCase(); //lowercase required
                            })];
                        })))
                    });
                    var screenIndex = Number(_.last(Object.keys(learnableScreensNew))) + 1;
                    learnableScreensNew[screenIndex] = typingScreen;
                    MEMRISE.garden.screen_template_map[k].typing = [typingScreen];
                }
            }
        });
    };
});
