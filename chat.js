/**
Copyright (c) 2013, Grosan Flaviu Gheorghe
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the author nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL GROSAN FLAVIU GHEORGHE BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/**
 * Chat Application Object.
 * @class Provides chat functionality.
 * @constructor
 */
var ChatJs = function() {
	// Client id array
	this._clients = [];

	// Client instance
	this.client = {};

	// The current user's name
	this.myName = null;

	// Create the UI as soon as ExtJS is ready
	Ext.onReady( function() {
		// Prepare the client list
		this.clientList = Ext.create( 'Ext.tree.Panel', {
			store: Ext.create( 'Ext.data.TreeStore', {
				data: {
					children: []
				}
			} )
			,width: 180
			,minWidth: 180
			,resizable: true
			,frame: false
			,border: true
			,lines: false
			,hideHeaders: true
			,collapsible: true
			,rootVisible: false
			,region: 'east'
			,title: 'Users'
		} );

		// Handle a text sending UI action
		var handleSendText = function() {
			if ( this.textField.getValue() ) {
				this.addText( "<b>" + this.myName + ":</b> " + Ext.htmlEncode( this.textField.getValue() ) );

				// Emit event
				this.client.emit( 'clientMessage', { text: this.textField.getValue() } );
			}
			this.textField.setValue( "" );
		}

		// Text field
		this.textField = Ext.create( 'Ext.form.field.Text', {
			width: 560
			,enableKeyEvents: true
			,listeners: {
				keydown: function( field, e, eOpts ) {
					if ( e.getKey() === 13 ) {
						handleSendText.bind( this )();
					}
				}.bind( this )
			}
		} );

		// Send button
		this.sendButton = Ext.create( 'Ext.button.Button', {
			text: 'Send'
			,handler: handleSendText.bind( this )
		} );

		// Prepare the text window
		this.textPanel = Ext.create( 'Ext.panel.Panel', {
			region: 'center'
			,border: true
			,frame: false
			,title: 'Messages'
			,bodyStyle: {
				padding: '5px'
			}
			,autoScroll: true
			// Start adding text from the bottom
			,html: '<div style="height: 3000px;">&nbsp;</div>'
			,bbar: [
				this.textField
				, '-'
				,this.sendButton
			]
			,listeners: {
				resize: function() {
					// Scroll to bottom
					this.textPanel.body.scroll( 'b', Infinity );

					// Resize text field
					this.textField.setWidth(
						this.textPanel.getWidth() - this.sendButton.getWidth() - 11
					);
				}.bind( this )
			}
		} );

		// Prepare the window
		this.chatWindow = Ext.create( 'Ext.window.Window', {
			title: 'ChatJS'
			,closable: false
			,maximizable: true
			,minimizable: false
			,resizable: true
			,constrainHeader: true
			,height: 500
			,width: 800
			,layout: 'border'
			,items: [
				this.clientList
				,this.textPanel
			]
		} );

		// Show
		this.chatWindow.show();

		// Mask, until a connection is made
		this.chatWindow.mask();
	}.bind( this ) );
};

/**
 * Handler for an 'okName' event.
 * @function
 */
ChatJs.prototype.okNameHandler = function() {
	// Focus the input field
	this.textField.focus( false, 200 );

	// Unmask the window
	this.chatWindow.unmask();

	// Request a new list of clients
	this.client.emit( 'clientList', {} );

	// Display welcome text
	this.addText( '<b>Welcome to ChatJS.</b>' );
}

/**
 * Method used for handling a lost connection.
 * @function
 */
ChatJs.prototype.disconnectHandler = function() {
	// Just display an error window
	Ext.Msg.show( {
		title: 'Error'
		,msg: 'Connection lost. Please reload the page.'
		,closable: false
		,width: 255
	} );
}

/**
 * Handler for an 'nameInUse' event.
 * @function
 */
ChatJs.prototype.nameInUseHandler = function() {
	// Show an error message, then the prompt asking for a new name
	Ext.Msg.show( {
		title: 'Name'
		,msg: 'Name is already in use. Please input a different name.'
		,buttons: Ext.Msg.OK
		,width: 350
		,modal: false
		,closable: false
		,fn: function() {
			// Display the prompt again
			this.createNamePrompt();
		}.bind( this )
	} );
}

/**
 * Method used for creating the name prompt.
 * @function
 */
ChatJs.prototype.createNamePrompt = function() {
	this.namePrompt = Ext.Msg.show( {
		title: 'Name'
		,msg: 'Please enter your name:'
		,width: 300
		,hideModel: 'hide'
		,buttons: Ext.Msg.OK
		,prompt: true
		,modal: false
		,closable: false
		,fn: function( button, text ) {
			// Set the name of this client
			this.client.emit( 'setName', { name: text } );
			
			// Store name
			this.myName = text;
		}.bind( this )
		,icon: Ext.window.MessageBox.INFO
	} );
}

/**
 * Method used for handling a successful connection.
 * @function
 */
ChatJs.prototype.connectHandler = function() {
	// Ignore if we already went through this process...
	if ( this._namePromptDisplayed ) {
		return;
	}
	this._namePromptDisplayed = true;

	// Request a name for this client
	// Hidden by an 'okName' event.
	this.createNamePrompt();
}

/**
 * Method used for handling an incoming message.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.clientMessageHandler = function( data ) {
	// Add text to window
	this.addText( '<b>' + data.name + ':</b> ' + Ext.htmlEncode( data.text ) );
}

/**
 * Method used for handling a client list event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.clientListMessageHandler = function( data ) {
	// Store the list of clients, for later use
	this._clientList = data.ids;

	// Reload UI list
	this.clientList.getRootNode().removeAll( false );
	this.clientList.getRootNode().appendChild( data.ids );
}

/**
 * Method used for appending text.
 * @param {String} text String to add to window.
 * @function
 */
ChatJs.prototype.addText = function( text ) {
	// Get DOM component
	var obj = Ext.get( 'messageArea' );

	// Apply extra formats
	text = Ext.util.Format.nl2br( text );

	this.textPanel.body.insertHtml( "beforeEnd", text + '<br>' );
	this.textPanel.body.scroll( 'b', Infinity );
}

/**
 * Method used for handling a new client connection.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.newClientHandler = function( data ) {
	// Add text to window
	this.addText( '<b>Client connected:</b> ' + data.name );

	// Request a new list of clients
	this.client.emit( 'clientList', {} );
}

/**
 * Method used for handling a disconnecting client event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.disconnectingClientHandler = function( data ) {
	// Add text to window
	this.addText( '<b>Client left:</b> ' + data.name );

	// Request a new list of clients
	this.client.emit( 'clientList', {} );
}