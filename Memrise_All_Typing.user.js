// ==UserScript==
// @name           Memrise All Typing
// @namespace      https://github.com/cooljingle
// @description    All typing / no multiple choice when doing Memrise typing courses
// @match          https://www.memrise.com/course/*/garden/*
// @match          https://www.memrise.com/garden/review/*
// @version        0.1.26
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
                                    <em style='font-size:85%'>only typing when reviewing an item which hasn't been watered for a while</em>
                                </div>
                                <div>
                                    <input class='all-typing-setting' id='include-mistake-reviews' type='checkbox'>
                                    <label for='include-mistake-reviews'>Include Mistake Reviews</label>
                                    <em style='font-size:85%'>only typing on items that reoccur after getting them wrong earlier in the session</em>
                                </div>
                                <div>
                                    <input class='all-typing-setting' id='include-learning' type='checkbox'>
                                    <label for='include-learning'>Include Learning</label>
                                    <em style='font-size:85%'>only typing on new items you are learning</em>
                                </div>
                                <div>
                                    <input class='all-typing-setting' id='include-typing-disabled' type='checkbox'>
                                    <label for='include-typing-disabled'>Include Typing Disabled</label>
                                    <em style='font-size:85%'>enables typing even if typing was disabled due to <ul><li>course column set to no typing, or </li><li>official Memrise course and text > 15 characters</li></ul></em>
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


    MEMRISE.garden.boxes.load = (function() {
        var cached_function = MEMRISE.garden.boxes.load;
        return function() {
            onReviews();
            onMistakeReviews();
            onLearning();
            onTypingDisabled();
            var result = cached_function.apply(this, arguments);
            MEMRISE.garden.populateScreens();
            return result;
        };
    }());

    function onReviews() {
        MEMRISE.garden.session.box_factory.is_lowest_rung = (function() {
            var cached_function = MEMRISE.garden.session.box_factory.is_lowest_rung;
            return function() {
                if(localStorageObject["include-reviews"] !== false) {
                    return false;
                } else {
                    return cached_function.apply(this, arguments);
                }
            };
        }());
    }

    function onMistakeReviews() {
        var b = MEMRISE.garden.boxes;
        b.add_next = overrideMistakeReviewFunc(b.add_next);
        b.addRandomlyBeforeNextForSameItem = overrideMistakeReviewFunc(b.addRandomlyBeforeNextForSameItem);
    }

    function overrideMistakeReviewFunc(func) {
        return (function() {
            var cached_function = func;
            return function() {
                if(localStorageObject["include-mistake-reviews"] !== false) {
                    makeMaybeTyping(arguments[0]);
                }
                return cached_function.apply(this, arguments);
            };
        }());
    }

    function onLearning() {
        MEMRISE.garden.session.box_factory.make = (function() {
            var cached_function = MEMRISE.garden.session.box_factory.make;
            return function() {
                var result = cached_function.apply(this, arguments);
                if (arguments[0].learn_session_level && localStorageObject["include-learning"] !== false) {
                    makeMaybeTyping(result);
                }
                return result;
            };
        }());
    }

    function onTypingDisabled() {
        MEMRISE.garden.session.box_factory.isTypingPossible = (function() {
            var cached_function = MEMRISE.garden.session.box_factory.isTypingPossible;
            return function() {
                if(localStorageObject["include-typing-disabled"] !== false) {
                    return true;
                } else {
                    return cached_function.apply(this, arguments);
                }
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
        _.each(MEMRISE.garden.learnables, function(v, k) {
            var learnableScreens = MEMRISE.garden.screens[k];
            if(learnableScreens && !_.contains(Object.keys(learnableScreens), "typing")) {
                var screenBase = _.find([learnableScreens.multiple_choice, learnableScreens.reversed_multiple_choice], s => s.answer.kind === "text");
                var column = _.find([v.item, v.definition], c => c.kind === "text");
                if(screenBase) {
                    learnableScreens.typing = $.extend({}, screenBase, {
                        template: "typing",
                        choices: "",
                        correct: _.uniq(_.flatten(_.map([column.value, ...column.alternatives, ...(learnableScreens.tapping ? _.map(learnableScreens.tapping.correct, t => t.join(" ")) : [])], function(y) {
                            return _.isArray(y) ? y : [y, _.map([..._.compact(y.split(/[();]+/)), y], function(x) { //bracket/semicolon delimitation
                                return x.replace(/[\u3000-\u303F\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-\/:;<=>?@\[\]^_`{|}~¿¡]/g, "") //strip punctuation
                                    .replace(/[\u00a0\u00A0]/g, " ") //sinister no-break spaces!
                                    .replace(/\./g, " ") //full stops are treated like spaces to memrise
                                    .replace(/\s{2,}/g, " ") //clear multiple spaces (e.g. from "a ... b")
                                    .trim() // trim spaces at beginning and end
                                    .toLowerCase(); //lowercase required
                            })];
                        })))
                    });
                }
            }
        });
    };
});
