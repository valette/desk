/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

qx.Theme.define("desk.theme.Color",
{
 extend : qx.theme.modern.Color,
  colors :	{
	  
//~ black, white, silver, gray, maroon,
//~ red, purple, fuchsia, green, lime,
//~ olive, yellow, navy, blue, teal,
//~ aqua, orange, brown.

	"OneFit-Button-start" : "white",
	
    "OneFit-Button-border-disabled" : "#A3A6A6",
    
    "OneFit-Button-start" : "white",
    "OneFit-Button-end" : "#88DBF8",
    
    "OneFit-Button-disabled-start" : "white",
    "OneFit-Button-disabled-end" : "#88DBF8",
    
    //~ "OneFit-Button-hovered-start" : "#CCEDFC",
    //~ "OneFit-Button-hovered-end" : "#00C7F0",
    "OneFit-Button-hovered-start" : "#88DBF8",
    "OneFit-Button-hovered-end" : "white",
    
    "OneFit-Button-focused" : "#00C7F0",
    
    
    "selected-start" : "#CCEDFC",
    "selected-end" : "#00C7F0",
    
    "menu-start" : "white",
    "menu-end" : "white",
    "menubar-start" : "white",
    
    "window-caption-active-start" : "#00CFF0",
    "window-caption-active-end" : "#006880",
    "window-caption-inactive-start" : "#A3A6A6",
    "window-caption-inactive-end" : "#3D3D3D",
    // pane color for windows, splitpanes, ...
    "background-pane" : "white",
    // tab view, window
    "border-pane" : "white",
    
    // own table colors
    //~ "table-focus-indicator" : "red",
    "table-row-background-focused-selected" : "#33D9F3",
    "table-row-background-focused" : "#88DBF8",
    "table-row-background-selected" : "#00C7F0",
    
    // other types
    "text-gray" : "#DDDDDD"

	}
 });
