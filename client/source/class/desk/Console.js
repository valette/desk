/**
 * A simple javascript output console
 */
qx.Class.define("desk.Console", 
{
    extend : qx.ui.window.Window,
 
    construct : function() {
        this.base(arguments);
        this.setLayout(new qx.ui.layout.VBox());
		this.setHeight(400);
		this.setWidth(800);
        var logArea = new desk.LogContainer();
        this.add(logArea, {flex : 1});

        var listenerId = desk.FileSystem.getInstance().addListener('log', function (e){
            logArea.log(e.getData());
        },this);
    
        this.addListener('close', function () {
            desk.FileSystem.getInstance().removeListenerById(listenerId);
        }, this);
        this.setCaption('console');
        this.open();
        this.center();
        return this;
    }
});