// ==UserScript==
// @name         PopcornSE
// @namespace    http://codequicksand.com
// @version      1.0
// @description  Show the incoming flags
// @author       Quill
// @match *://chat.stackexchange.com/rooms/*
// @match *://chat.stackoverflow.com/rooms/*
// @match *://chat.meta.stackexchange.com/rooms/*
// @grant        none
// ==/UserScript==

(function(global){
    'use strict';
    var localStorageLookupKey = "PopcornSE_Events";
    var NOTABLE_EVENT_TYPES = {
        MessageFlagged: 9,
        ModeratorFlag: 12,
        UserSuspended: 29
    };
    var events = {};
    if (!localStorage.hasOwnProperty(localStorageLookupKey)){
        localStorage.setItem(localStorageLookupKey, JSON.stringify({}));
    }
    function mergeEvents(){
        var storedEvents = JSON.parse(localStorage.getItem(localStorageLookupKey));
        Object.keys(events).forEach(function(messageId){
            var event = events[messageId];
            if (!Object.keys(storedEvents).hasOwnProperty(messageId)){
                storedEvents[messageId] = event;
            }
        });
        localStorage.setItem(localStorageLookupKey, JSON.stringify(storedEvents));
        setFlagScore(Object.keys(storedEvents).length);
    }
    function setFlagScore(flagScore){
        if ($('._popcornCount').length !== 0){
            $('._popcornCount')[0].parentNode.removeChild($('._popcornCount')[0]);
        }
        if (flagScore === 0){ return false; }
        var profileImageArea = $('div#active-user')[0].parentElement;
        var extraStyles = "" +
            "background-color: rgb(138, 118, 222);" +
            "background: rgb(138, 118, 222);" +
            "text-shadow: 0 1px 0 #c6cdcb;" +
            "color: #2b3a35 !important;" +
            "left: 55px;" +
            "top: 55px;" +
            "z-index: 5;" +
            "position: absolute;" +
            "visibility: visible;" +
            "display: block;";
        var flagCountHTML = "<div class=\"_popcornCount\" id=\"reply-count\" style=\"" + extraStyles + "\">" + flagScore + "</div>";
        $(profileImageArea).append(flagCountHTML);
        $('._popcornCount')[0].addEventListener('click', openPopup);
    }
    function eventBuilder(type, messageContent, messageId, room){
        var builtEvent = {
            'type': type,
            'content': messageContent,
            'room': room,
            'message_id': messageId
        };
        events[messageId] = builtEvent;
        mergeEvents();
    }

    function processEvent(event){
        switch(event.event_type){
            case NOTABLE_EVENT_TYPES.MessageFlagged:
                eventBuilder("Message flag", event.content, event.message_id, {
                    id: event.room_id,
                    name: event.room_name
                });
                break;
            case NOTABLE_EVENT_TYPES.ModeratorFlag:
                eventBuilder("Moderator flag", event.content, event.message_id, {
                    id: event.room_id,
                    name: event.room_name
                });
                break;
            case NOTABLE_EVENT_TYPES.UserSuspended:
                eventBuilder("User suspended", event.content, event.message_id, {
                    id: event.room_id,
                    name: event.room_name
                });
                break;
        }
    }

    var socket;
    var roomid = Number(/\d+/.exec(location)[0]);
    var url;

    function connect() {
        $.post('/ws-auth', fkey({
            roomid: roomid
        })).done(function (data) {
            url = data.url;
            poll();
        });
    }

    function poll() {
        socket = new WebSocket(url + '?l=' + Date.now());
        socket.onmessage = ondata;
        socket.onclose = onclose;
    }

    function ondata(response) {
        var frame = JSON.parse(response.data);
        Object.keys(frame).forEach(function(room){
            if ('e' in frame[room]) {
                processEvent(frame[room].e[0]);
            }
        });
    }

    function onclose() {
        socket.close();
        socket = null;
        setTimeout(poll, 1000 * 10);
    }

    function openPopup(){
        var storedEvents = JSON.parse(localStorage.getItem(localStorageLookupKey));
        var contentString = "" +
        "<div class=\"wmd-prompt-background\" style=\"position: fixed; top: 0px; z-index: 1000; opacity: 0.5; left: 0px; width: 100%; height: 100%;\"></div>" +
        "<div style=\"top: 4%; left: 12%; display: block; padding: 10px; position: fixed; width: 75%; z-index: 1001;\" class=\"wmd-prompt-dialog\">" +
            "<div style=\"position: absolute; right: 20px; bottom: 5px; font-size: 10px;\">PopcornSE by <a title=\"quill's website\" href=\"http://codequicksand.com\">Quill</a></div>" +
            "<p><b>" + Object.keys(storedEvents).length + " things happened.</b></p>" +
            "<p style=\"padding-top: 0.1px;\"></p>";
            "<input class=\"button\" type=\"button\" id=\"_erase\" value=\"Erase flags\" style=\"width: 7em; margin: 10px;\">" +
            "<input class=\"button\" type=\"button\" id=\"_close\" value=\"Close popup\" id=\"close-dialog-button\" style=\"width: 7em; margin: 10px 10px 20px;\">" +
            Object.keys(storedEvents).forEach(function(key){
                var event = storedEvents[key];
                contentString += "" +
                    "<p style=\"padding-top: 4px; margin:0; line-height: 16px;\">" +
                        "- <a href=\"http://" + document.location.hostname + "/transcript/message/" + event.message_id + "#" + event.message_id "\">" + event.type + "</a> in " +
                        "<a href=\"http://" + document.location.hostname + "/rooms/" + event.room.id + "\">" +
                            event.room.name +
                        "</a>" +
                    "</p>" +
                    "<code>" + event.content + "</code><hr />";
            });
            contentString += "</div>";
        $('body').append(contentString);
        $("#_erase").click(function(){
            localStorage.setItem(localStorageLookupKey, JSON.stringify({}));
            $('._popcornCount')[0].parentNode.removeChild($('._popcornCount')[0]);
        });
        $("#_close").click(function(){
            $(".wmd-prompt-background").remove();
            $(".wmd-prompt-dialog").remove();
        });
    }
    connect();
})(window);
