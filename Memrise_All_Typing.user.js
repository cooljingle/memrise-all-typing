// ==UserScript==
// @name           Memrise All Typing 
// @namespace      https://github.com/cooljingle
// @description    All typing / no multiple choice when doing Memrise typing courses
// @match          https://www.memrise.com/course/*/garden/*
// @match          https://www.memrise.com/garden/review/*
// @version        0.1.3
// @updateURL      https://github.com/cooljingle/memrise-all-typing/raw/master/Memrise_All_Typing.user.js
// @downloadURL    https://github.com/cooljingle/memrise-all-typing/raw/master/Memrise_All_Typing.user.js
// @grant          none
// ==/UserScript==

$(document).ready(function() {

    //*****************************************************************************************************************************
    //MEMRISE ALL TYPING
    //-----------------------------------------------------------------------------------------------------------------------------
    //This userscript prevents multiple choice from occuring in typing courses, replacing it with a typing prompt.
    //You can configure the extent to which this happens by setting these values to true/false:
    //  INCLUDE_REVIEWS: suppresses multiple choice when reviewing an item which hasn't been watered for a while.
    //  INCLUDE_MISTAKE_REVIEWS: suppresses multiple choice on items that reoccur after getting them wrong earlier in the session.
    //  INCLUDE_LEARNING: suppresses multiple choice on new items you are learning.
    //*****************************************************************************************************************************

    var INCLUDE_REVIEWS = true;
    var INCLUDE_MISTAKE_REVIEWS = true; 
    var INCLUDE_LEARNING = true;

    MEMRISE.garden.boxes.load = (function() {
        var cached_function = MEMRISE.garden.boxes.load;
        return function() {
            if (INCLUDE_REVIEWS) {
                enableAllTypingReviews();
            }            
            if (INCLUDE_MISTAKE_REVIEWS) {
                enableAllTypingMistakeReviews();
            }
            if (INCLUDE_LEARNING) {
                enableAllTypingLearning();
            }

            return cached_function.apply(this, arguments);
        };
    }());

    function enableAllTypingReviews() {
        MEMRISE.garden.session.box_factory.is_lowest_rung = function() {
            return false;
        };
    }

    function enableAllTypingMistakeReviews() {
        MEMRISE.garden.boxes.add_next = (function() {
            var cached_function = MEMRISE.garden.boxes.add_next;
            return function() {
                makeMaybeTyping(arguments[0]);
                return cached_function.apply(this, arguments);
            };
        }());
    }

    function enableAllTypingLearning() {
        MEMRISE.garden.session.box_factory.make = (function() {
            var cached_function = MEMRISE.garden.session.box_factory.make;
            return function() {         
                var result = cached_function.apply(this, arguments);
                if (arguments[0].learn_session_level) {
                    makeMaybeTyping(result);
                }
                return result;
            };
        }());
    }

    function makeMaybeTyping(box) {
        if (box.template === "multiple_choice") {
            var boxCopy = jQuery.extend({}, box);
            box.template = MEMRISE.garden.session.box_factory.makeMaybeTyping(boxCopy).template;
        }
    }

});
