// ==UserScript==
// @name           Memrise All Typing
// @namespace      https://github.com/cooljingle
// @description    All typing / no multiple choice when doing Memrise typing courses
// @match          https://www.memrise.com/course/*/garden/*
// @match          https://www.memrise.com/garden/review/*
// @version        0.1.5
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
                                    <input class='all-typing-setting' id='include-tapping' type='checkbox'>
                                    <label for='include-tapping'>Include Tapping</label>
                                    <em style='font-size:85%'>tapping tests will be converted to typing along with multiple choice</em>
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
            return cached_function.apply(this, arguments);
        };
    }());

    function onReviews() {
        MEMRISE.garden.session.box_factory.is_lowest_rung = function() {
            if(localStorageObject["include-reviews"] !== false) {
                return false;
            }
        };
    }

    function onMistakeReviews() {
        MEMRISE.garden.boxes.add_next = (function() {
            var cached_function = MEMRISE.garden.boxes.add_next;
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
        MEMRISE.garden.session.box_factory.isTypingDisabled = function() {
            if(localStorageObject["include-typing-disabled"] !== false) {
                return false;
            }
        };
    }

    function makeMaybeTyping(box) {
        if (box.template === "multiple_choice" || (localStorageObject["include-tapping"] !== false && box.template === "tapping")) {
            var boxCopy = jQuery.extend({}, box);
            box.template = MEMRISE.garden.session.box_factory.makeMaybeTyping(boxCopy).template;
        }
    }

});
