/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

qx.Theme.define("desk.theme.Decoration",
{
  extend      : qx.theme.modern.Decoration,
<<<<<<< HEAD
  decorations : {}
});
=======
  decorations : {
		
		"leftPanelButton" :
		{
			decorator : [
				qx.ui.decoration.MLinearBackgroundGradient
			],
			style :
			{
				startColor: "OneFit-Button-start",
				endColor: "OneFit-Button-end",
				startColorPosition: 10,
				endColorPosition: 100,
				orientation : "horizontal"
			}
		},
		
		"toolsBarButton" :
		{
			decorator : [
				qx.ui.decoration.MSingleBorder,
				qx.ui.decoration.MBorderRadius,
				qx.ui.decoration.MLinearBackgroundGradient
			],
			style :
			{
				color: "OneFit-Button-disabled-start",
				width: 3,
				startColor: "OneFit-Button-start",
				endColor: "OneFit-Button-end",
				startColorPosition: 21,
				endColorPosition: 100
			}
		},
		
		"tBButton-disabled" :
		{
		  include : "toolsBarButton",
		  style : {
			startColor: "OneFit-Button-disabled-start",
			//~ endColor: "button-disabled-end"
			endColor: "OneFit-Button-disabled-start"
		  }
		},
		
		"tBButton-hovered" :
		{
		  include : "toolsBarButton",
		  style : {
			radius : 10,
			color: "OneFit-Button-hovered-start",
			//~ startColor : "OneFit-Button-hovered-start",
			startColor : "OneFit-Button-hovered-end",
			endColor : "OneFit-Button-hovered-end",
			startColorPosition: 0,
			endColorPosition: 100
		  }
		},

		"tBButton-checked" :
		{
		  include : "toolsBarButton",
		  style : {
			radius : 10,
			color: "OneFit-Button-hovered-start",
			startColor: "OneFit-Button-end",
			endColor: "OneFit-Button-hovered-end"
		  }
		},

		"tBButton-pressed" :
		{
			include : "toolsBarButton",
			style : {
				radius : 10,
				color: "OneFit-Button-focused",
						//~ endColor : "OneFit-Button-disabled-start",
						//~ startColor : "OneFit-Button-focused"
				endColor : "OneFit-Button-hovered-end",
				startColor : "OneFit-Button-hovered-start",
				//~ endColor : "OneFit-Button-disabled-start",
				//~ startColor : "OneFit-Button-disabled-start",
				startColorPosition: 37,
				endColorPosition: 64
			}
		}

		/*
		"button-css" :
		{
		  decorator : [
			qx.ui.decoration.MSingleBorder,
			qx.ui.decoration.MLinearBackgroundGradient,
			qx.ui.decoration.MBorderRadius
		  ],

		  style :
		  {
			//~ radius: 3,
			//~ color: "border-button",
			//~ width: 1,
			startColor: "button-start",
			endColor: "button-end",
			startColorPosition: 0,
			endColorPosition: 100
		  }
		},

		"button-disabled-css" :
		{
		  include : "button-css",
		  style : {
			//~ color : "button-border-disabled",
			startColor: "button-disabled-start",
			endColor: "button-disabled-end"
		  }
		},

		"button-hovered-css" :
		{
		  include : "button-css",
		  style : {
			radius : 10,
			startColor : "button-hovered-start",
			endColor : "button-hovered-end"
		  }
		},

		"button-checked-css" :
		{
		  include : "button-css",
		  style : {
			radius : 10,
			endColor: "button-start",
			startColor: "button-end"
		  }
		},

		"button-pressed-css" :
		{
		  include : "button-css",
		  style : {
			  radius : 10,
			endColor : "button-disabled-start",
			startColor : "button-focused"
		  }
		},

		"button-focused-css" : {
		  decorator : [
			qx.ui.decoration.MDoubleBorder,
			qx.ui.decoration.MLinearBackgroundGradient,
			qx.ui.decoration.MBorderRadius
		  ],

		  style :
		  {
			radius: 3,
			//~ color: "border-button",
			width: 1,
			innerColor: "button-focused",
			innerWidth: 2,
			startColor: "button-start",
			endColor: "button-end",
			startColorPosition: 30,
			endColorPosition: 100
		  }
		},

		"button-checked-focused-css" : {
		  include : "button-focused-css",
		  style : {
			endColor: "button-start",
			startColor: "button-end"
		  }
		},

		// invalid
		"button-invalid-css" : {
		  include : "button-css",
		  style : {
			//~ color: "border-invalid"
		  }
		},

		"button-disabled-invalid-css" :
		{
		  include : "button-disabled-css",
		  style : {
			//~ color : "border-invalid"
		  }
		},

		"button-hovered-invalid-css" :
		{
		  include : "button-hovered-css",
		  style : {
			//~ color : "border-invalid"
		  }
		},

		"button-checked-invalid-css" :
		{
		  include : "button-checked-css",
		  style : {
			//~ color : "border-invalid"
		  }
		},

		"button-pressed-invalid-css" :
		{
		  include : "button-pressed-css",
		  style : {
			//~ color : "border-invalid"
		  }
		},

		"button-focused-invalid-css" : {
		  include : "button-focused-css",
		  style : {
			//~ color : "border-invalid"
		  }
		},

		"button-checked-focused-invalid-css" : {
		  include : "button-checked-focused-css",
		  style : {
			//~ color : "border-invalid"
		  }
		}
		* */
		
	}
});
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
