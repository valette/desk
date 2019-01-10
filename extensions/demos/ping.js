"use strict";
/* globals qx desk */

var win = new qx.ui.window.Window();
var log = new desk.LogContainer();
log.set({backgroundColor : "black", width : 700, height : 300});
win.setLayout(new qx.ui.layout.HBox());
win.add(log);
win.open();
win.center();

var action = desk.Actions.execute({action : "ping"},
{
    listener : function (message) {
        if (message.type === "stdout") {
            log.log(message.data, "white");
        }
    }
});

win.addListener('close', function () {
    desk.Actions.killAction(action);
});