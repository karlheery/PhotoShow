/** @jsx React.DOM */

/** These are defaults for testing. Real list is queried from Dynamo DB through API Gateway & Lambda */
var albums = [
    {
        name: "testAlbum",
            background: "http://localhost:8080/PhotoShow/test_images/test_background.jpg",
            description: "Welcome to your test album",
            bucket_url: "http://localhost:8080/PhotoShow/test_images/media/",
            basedir: "",
            name_contains: "",
            medialist: [ "test1.jpg", "test2.jpg", "test3.jpg" ]
    }
];


var comments = {};

// caches the chosen album - a hack as should be able to store in React state, but asynch javascript methods causing me trouble
var album = {};

		
/**
 * Component to choose the show we want to display
 * Presents the list based on above array of albums
 */
var ShowSelector = React.createClass({

     
    getInitialState: function() {
        return { albums: this.props.data };
    },


    componentDidMount: function() {

        window.showSelector = this;

        // The URL for this is "https://x4jqp9pcgl.execute-api.eu-west-1.amazonaws.com/prod";
        var apigClient = apigClientFactory.newClient({
			apiKey:  'PhotoShowWebApp'  // '39g6ekzgwh'
		});

        var params = {			
            //This is where any header, path, or querystring request params go. The key is the parameter named as defined in the API            
			headers: {
                "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
            }
        };
        var body = {
            //This is where you define the body of the request
        };
        var additionalParams = {
            //If there are any unmodeled query parameters or headers that need to be sent with the request you can add them here            
			headers: {
                "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
            },
            queryParams: {
                //param0: '',
                //param1: ''
            }
        };

        //var pathTemplate = '/getAlbums';
		//var method = 'GET';
		
		console.log( "retrieving available albums" );    
		
        // Each API call returns a promise, that invokes either a success and failure callback		
		apigClient.rootGet(params, body, additionalParams)		        
            .then(function(result){

                console.log( "called getAlbums API: " + result.data );                

                try{
                    // now save the new state of albums as a result of API call
                    window.showSelector.setState({ albums: result.data });
                }
                catch (e) { console.error( "problem "  + e); }

            });
                        
    },


    /** 
     * Process click of album
     * I should be able to pass in and read album rather than have to search array again, right?9
     * 
     */
    startShow: function(e) {
        console.log( "Starting " + e.target.name + " show..." );

        // find the album again
        for(var i=0; i < this.state.albums.length; i++) {
            if( this.state.albums[i].name == e.target.name ) {
                album = this.state.albums[i];
                this.setState({ album: this.state.albums[i] });
            }
        }

        var photoShow = <PhotoShow data={album} />;
        React.render(photoShow, document.getElementById('app'));
    },



    /**
     * Display the list of albums available for viewing, as a series of buttons
     * 
     */
    render: function() {

        var albumArray = this.state.albums;

        // if nothing to show...
        if( !albumArray.length > 0 ) {
                   
            return(		<div className="panel panel-default">                        
                            <center>
                            <div className="page-header">
                            <h1>Welcome to PhotoShow</h1>
                            <small>React SPA rendering S3 images to a HTML canvas, on a serverless cloud infrastructure.</small>                    
                            </div>
                            <div>
                                <font color='red'>
                                Oops! Can't seem to find any albums right now! Karl - sort it out man!
                                In the meantime, here's a dummy one:
                                </font>
                                
                                <button type="button" name='testAlbum#' className="button button2"  block onClick={this.startShow}>testAlbum</button>

                            </div>
                            </center>
                        </div>				
            );
        }


        console.log( "displaying " + albumArray.length + " album tiles" );

        var rows = [];
        for (var i=0; i < albumArray.length; i++) {                    
            rows.push( <button type="button" name={albumArray[i].name} className="button button2"  block onClick={this.startShow}>{albumArray[i].name}</button> );                    
        }

        console.log( "displaying albums " + rows );

        return( 
			<div className="panel panel-default">
            <center>
                <div className="page-header">
                    <h1>Welcome to PhotoShow</h1>
                    <small>React SPA rendering S3 images to a HTML canvas, on a serverless cloud infrastructure.</small>                    
                </div>
                <div className="panel-body">
                    {rows}
                </div>
            </center>
            </div>
        );

    }

});


var PhotoShow = React.createClass({

    componentDidMount: function() {

        // DEV
        var appId = '757081597762955';

		// PROD 
        //var appId = '754651064672675';
        
        var roleArn = 'arn:aws:iam::827454618391:role/PhotoShowRole';
        var bucketName = 'khphotoshow';
        AWS.config.region = 'eu-west-1';

        var bucket = new AWS.S3({
            params: {
             Bucket: bucketName
            }
        });
        var fbUserId;
      
        window.photoShow = this;
      
        /*!
         * Login to your application using Facebook.
         * Uses the Facebook SDK for JavaScript available here:
         * https://developers.facebook.com/docs/javascript/gettingstarted/
         */
        window.fbAsyncInit = function () {
        FB.init({
                appId: appId,
				cookie  : false
        });
        
        FB.getLoginStatus(function(response) {

            if (response.status === 'connected') {
                // the user is logged in and has authenticated your app, and response.authResponse supplies
                // the user's ID, a valid access token, a signed request, and the time the access token 
                // and signed request each expire
                var fbUserId = response.authResponse.userID;
                var accessToken = response.authResponse.accessToken;

                var messageArea = document.getElementById('messageArea');
                //messageArea.innerHTML = "Welcome " + fbUserId;  

                console.log( "authenticating with facebook using ARN " + roleArn );                
                bucket.config.credentials = new AWS.WebIdentityCredentials({
                    ProviderId: 'graph.facebook.com',
                    RoleArn: roleArn,
                    WebIdentityToken: response.authResponse.accessToken
                    });
                
                fbUserId = response.authResponse.userID;
                console.log( "identified FB user id " + fbUserId );                            

                // if we want FB specific folder access do it here
                console.log( "getting S3 objects from " + album.basedir + " that contains " + album.name_contains );

                window.photoShow.loadFilesFromS3( bucket, album, 0, null );				
				window.photoShow.loadComments( album );
	
                // @TODO hack in snow for now 
                if( album.name == "Christmas" ) {
                    console.log("starting show...");
                    $(document).ready( function(){ 
                        $.fn.snow(); 
                    }); 
                }

            } else {
                // the user is logged in to Facebook, but has not authenticated your app i.e. response.status === 'not_authorized'
                // or the user isn't logged in to Facebook.
				console.log( "not-authenticated? redirecting back to home page: " + response.status );
				alert("Not-authenticated: " + response.status);				
								
				window.location.href="index.html";
                FB.login();       // popup approach
            }
        }, true);
        };


         // Load the Facebook SDK asynchronously
        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) {
                return;
            }
            js = d.createElement(s);
            js.id = id;
            js.src = "//connect.facebook.net/en_US/all.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));



    },




    /**
     * Seek out files of interest from our S3 bucket and store in album's medialist
     */
    loadFilesFromS3: function( bucket , album, index, marker ) {

        // parameters for the search
        var params = {
            Prefix: album.basedir
        };	

        // pick up where we left off
        if( marker ) {
            console.log( "listing next set of objects starting from " + index + " (marker: " + marker + ")" );
            params.Marker = marker;
        }

        // hardcoded test album
        if( album.name == "testAlbum" ) {
            return;
        }

        bucket.listObjects( params, function (err, data) {        
            if (err) {
                msg = "failed to load images from " + prefix + ". ERROR: '" + err;
                console.error( msg );
                            
                var messageArea = document.getElementById('messageArea');
                messageArea.innerHTML = msg;                       
            } else {    

                data.Contents.forEach(function (obj) {

                    index += 1;

                    //console.log( "object " + index + " - considering " + obj.Key  );

                    // ignore directory
                    if( obj.Key.endsWith("JPG") || obj.Key.endsWith("jpg") || obj.Key.endsWith("jpeg") || 
                        obj.Key.endsWith("png") || obj.Key.endsWith("bmp") ) {

                        // check its from our desired folder
                        // ANOTHER HACK!
                        if( obj.Key.includes( album.name_contains ) ) {                  
                            console.log( "adding media file "+ obj.Key + " to list of " + this.album.medialist.length  );
                            this.album.medialist.push(obj.Key);
                        }
                    }                        
                }); 
                
                // are we paging?
                if (data.IsTruncated) {
                    var length = data.Contents.length;
                    var marker = data.Contents[length-1].Key;
                    // recursion!
                    window.photoShow.loadFilesFromS3( bucket, album, index, marker );
                }
            }
        }); // end of function
				
		
    },

	
	
	
    /**
     * cache comments for album (or indeed for now - all media)
     */
    loadComments: function( album ) {

		console.log( "loading comments for" );		
		
		// The URL for this is "https://x4jqp9pcgl.execute-api.eu-west-1.amazonaws.com/prod";
        var apigClient = apigClientFactory.newClient({
			apiKey:  'PhotoShowWebApp'  // '39g6ekzgwh'
		});

        var params = {			
            //This is where any header, path, or querystring request params go. The key is the parameter named as defined in the API            
			headers: {
                "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
            }
        };
        var body = {
            "album": this.album
        };
		var additionalParams = {
            //If there are any unmodeled query parameters or headers that need to be sent with the request you can add them here            
			headers: {
                "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
            },
            queryParams: {
                //param0: '',
                //param1: ''
            }
        };

		
        // Each API call returns a promise, that invokes either a success and failure callback		
		apigClient.getallcommentsGet(params, body, additionalParams)		        
            .then(function(result){
                
                try{
					commentsData = result.data.body;
					this.album.comments = JSON.parse(commentsData);					
					this.album.comments = this.album.comments.Comments;
					console.log( "retrieved " + this.album.comments.length + " comments" );                
				}
                catch (e) { 
					this.album.comments = {}; 
					console.error( "problem "  + e); 
				}

            });
        
	},


    render: function() {
        return ( 
            <div>                        
            <MediaCanvas background={this.props.data.background}
                description={this.props.data.description}
                bucket_url={this.props.data.bucket_url} 
                basedir={this.props.data.basedir} 
                name_contains={this.props.data.name_contains}
                medialist={this.props.data.medialist} />
            </div> 
        );
    }

});



/**
 * Handles rendering of image details - to allow saving comments, excluding from album, adding to other albums etc.
 */
var ClickedImageDetails = React.createClass({
      		
    getInitialState: function() {      				
		return { comment : this.props.data.comment, excluded: false };   // for indexing the photos		
    },

	componentDidMount: function() {        
		window.clickedImage = this;
	},

	
	handleChange: function(v) {		
		if( event.target.value !== null ) {			
			this.setState({comment: event.target.value});
		}
			
	},
	
	handleSubmit: function(event) {
		//prompt('Save Comment?: ' + this.state.comment);
		saveComment();
	},

	
	saveComment: function() {
		console.log( "saving comment: [" + this.state.comment + "] against image " + this.props.data.imageDisplayed );		
		
		// The URL for this is "https://x4jqp9pcgl.execute-api.eu-west-1.amazonaws.com/prod";
        var apigClient = apigClientFactory.newClient({
			apiKey:  'PhotoShowWebApp'  // '39g6ekzgwh'
		});

        var params = {			
            //This is where any header, path, or querystring request params go. The key is the parameter named as defined in the API            
			headers: {
                "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
            }
        };
        var body = {
            "media_filename": this.props.data.imageDisplayed,
			"author": "",	// no author captured
			"comment": this.state.comment
        };
        var additionalParams = {
            //If there are any unmodeled query parameters or headers that need to be sent with the request you can add them here            
			headers: {
                "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
            },
            queryParams: {
                //param0: '',
                //param1: ''
            }
        };

		
        // Each API call returns a promise, that invokes either a success and failure callback		
		apigClient.photoCommentsPost(params, body, additionalParams)		        
            .then(function(result){

				console.log( "Response: " + JSON.stringify(result.data) );

                try{
                    // now cache & show the new comment
					//
					this.album.comments.push(result.data.Comment);
					window.mediaCanvas.closeSidebar();
										
					// @TODO NOW SHOW THE COMMENT ON THE PICTURE!                    
					var canvas = document.getElementById( 'mediaview' );
					var context = canvas.getContext('2d');        					
					context.font = 'italic 20pt Calibri';
					context.fillStyle = "#FF2222";                                                                                
					context.fillText( result.data.Comment.comment.comment_text, 200, 50 );									
					context.font = 'italic 10pt Calibri';
					
                }
                catch (e) { console.error( "problem "  + e); }

            });
                  
				  
	},
	
	
	excludeImage: function() {
		console.log( "excluding image: "+ this.props.data.imageDisplayed + " from album " + album.name );
		
	},	
	
    render: function() {
		
		console.log( "rendering ClickedImageDetails for " + this.props.data.imageDisplayed );
		
				
        return ( 
			<div>
					<a href="javascript:void(0)" className="closebtn" onClick={function(){window.mediaCanvas.closeSidebar()}}>&times;</a>
					<a href="#">Exclude</a>

					<p>
					<img src={this.props.data.imageDisplayed} width='50' height='50'/>
					</p>
					
					<p>
						<input type="text" width="50" id='comment-field' value={this.state.comment} className="form-control" placeholder="Enter comment here..." 
							onChange={this.handleChange.bind(this,event)}/>				
							
						<button id='save-comment-button' type='button' className='btn btn-default' title='Save' 
							onClick={this.saveComment}>Save</button>
					</p>
											
					
					<p>
					<button id='exclude-button' type="button" className='btn btn-default' title='Exclude'
						onClick={this.excludeImage}>Exclude</button>
					</p>
					
			</div>
        );
    }

});



/**
 * MediaCanvas
 * 
 * Controls the rendering of images on canvas, and all that that entails ...probably too much responsibility in fact
 * 
 */
var MediaCanvas = React.createClass({

      
    getInitialState: function() {
        return { index: -1, playOrPauseAction: "Pause", shuffleOrUnshuffleAction: "Shuffle", quadrant: 1 };   // for indexing the photos
    },


    componentDidMount: function() {        
        // JS methodrequestAnimationFrame added to allow smooth optimised updating of graphics (60fps) 
        // MIGHT USE THIS LATER - NOT FOR PHOTOS THOUGH
        //var aid = requestAnimationFrame( this.showMedia.bind(this) );
        //this.setState({ animationId: aid });

        // set interval for the timer between showing photos
        this.timer = setInterval(this.showMedia, 4000);
        
        var canvas = document.getElementById( 'mediaview' );
        var context = canvas.getContext('2d');        
        
        var description = this.props.description;
        
        context.fillStyle = "#EEEEEE";
        context.strokeStyle= "#444444";
        context.lineWidth = 2;        


        var background = new Image();
        background.src = this.props.background;

        background.onload = function(){
            context.drawImage(background,0,0);

            //context.globalAlpha = 0.5;
            //context.font = "Comic Sans MS";
            context.font = "italic 20px Calibri";			
            context.textBaseline = "top";
            context.fillStyle = "#AAAAFF bold";            
            //context.fillText( "hello", 20, 20 );
            context.fillText( description, 20, 20 );
            //context.globalAlpha = 1.0;   
        }
                
        window.mediaCanvas = this;

    },


    componentWillUnmount: function(){
        clearInterval(this.timer);
    },
    

    componentDidUpdate: function() {
    },

    

    
   
        
    /** 
     * Recursive loop through the array of medialist items, displaying each 
     */
    showMedia: function() {

        var canvas = document.getElementById( 'mediaview' );
        var context = canvas.getContext('2d');
        //var context = this.getDOMNode().getContext('2d');
        var messageArea = document.getElementById('messageArea');                        
        
        
        // if we're at the end of the media list, do nothing
        // might I get a race condition here if animation id hasnt been saved in state yet above
        //if( this.state.index >= this.props.medialist.length ) {
        if( !this.state.indexArray || this.state.indexArray.length <= 0 ) {
            console.log( "no (more) media - going back to start"  );
            
            // create an array of indexes of 0...N which we'll iterate through (or perhaps shuffle) to 
            //  choose what media to display
            console.log( "created indexArray of " + this.props.medialist.length + " items" );
            indexArray = Array.apply(null, {length: this.props.medialist.length}).map(Number.call, Number)
            this.setState({ indexArray: indexArray });

            // shuffle or unshuffle according to (or indeed to flip from and therefore implement) initial state
            window.mediaCanvas.toggleShuffle(); // refactor shuffle from toggle

        }


        // pop the first value from the array
	    var index = this.state.indexArray.shift();

        // otherwise show the next image...
        mediafile =  this.props.bucket_url + this.props.medialist[index];
        console.log( "showing image " + index + " of " + this.props.medialist.length + ": " + mediafile + "(" + this.state.indexArray.length + " left) in quadrant " +  this.state.quadrant );

        // break screen into 4 quadrants so not completely random placement
        //
        var maxX = Math.floor( canvas.width * 0.1 );;
        var maxY = Math.floor( canvas.height * 0.1 );

        var xpos = 0;
        var ypos = 0;

        if( this.state.quadrant == 1 ) {
            xpos = Math.floor((Math.random() * maxX) + 1); 
            ypos = 50 + Math.floor((Math.random() * maxY) + 1);
        }
        else if( this.state.quadrant == 2 ) {
            xpos = canvas.width * 0.5 + Math.floor((Math.random() * maxX) + 1); 
            ypos = 50 + Math.floor((Math.random() * maxY) + 1);
        }
        else if( this.state.quadrant == 3 ) {
            xpos = Math.floor((Math.random() * maxX) + 1); 
            ypos = canvas.height * 0.5 + Math.floor((Math.random() * maxY) + 1);
        }
        else {
            xpos = canvas.width * 0.5 + Math.floor((Math.random() * maxX) + 1); 
            ypos = canvas.height * 0.5 + Math.floor((Math.random() * maxY) + 1);
            this.setState({quadrant: 0});    
        }

        this.setState({quadrant: this.state.quadrant + 1});    

        // we'll rotate up to 5 deg max, and flip it half the time to negative
        var rotationAngle = Math.floor((Math.random() * 5) + 0) * Math.PI / 180;
        if( Math.floor((Math.random() * 2) + 1) == 2 )
            rotationAngle = rotationAngle * -1;


        // font setting for writing on photos
        context.font = "italic 10px Calibri";
        context.textBaseline = "top";            

        // Getting image data
        //
        var http = new XMLHttpRequest();
        http.open("GET", mediafile, true);
        http.responseType = "blob";
        http.onload = function(e) {

            // assuming we load the media file URL ok
            //
            if (this.status === 200) {

            image = new Image();
            image.src = mediafile;
			
            //image.src = "http://localhost:8080/PhotoShow/test_images/media/Hugo.mp4";
            messageArea.innerHTML = "" //<img src='" + mediafile + "' width=50 height=50/>";
            var scaledWidth = 600;
            var scaledHeight = 400;
            
            // might have issues later from having commented this callback approach out, but was losing reference
            // to "this" which was stopping me call requestAnimationFrame again from within.
            // I should be using interval anyway not animation right - so use this instead and reinstate onload?
            // http://jsfiddle.net/martinaglv/3fZT2/

            // this callback causes the page crash, as saves/restores build up!
            // make images smaller and/or widen interval to solve?
            // Only way I can do sve & restores outside of onload is if I dont care about dimensions of photo??
            //
        
            image.onload = function(){

                var orientation;
                var dateTaken;
				var comment;
								
                EXIF.getData(image, function() {
                    var orientation = EXIF.getTag(this, "Orientation");                   
                    var dateTaken = EXIF.getTag(this, "DateTimeOriginal");
                    if( !(dateTaken === undefined || dateTaken == null || dateTaken.length <= 0) ) {
                        // TODO
						//console.log( dateTaken );
                        // NOT WORKING?!?!?!
                        //var d1 = Date.parseExact(dateTaken, 'yyyy:MM:dd hh:mm:ss' );
                        //console.log( d1 );
                        //dateTaken = d1.toString('MMMM d, yyyy');
                    }
                    else{
                        dateTaken = "";
                    }
                    
                    var rotatedPhoto = false;
                    
                    // scale the image down if we have to, to X% of the canvas real estate.        
                    var scale = 0.4;     
                    scaledWidth = canvas.width * scale;
                    //scaledHeight = image.height / image.width * scaledWidth;
                    scaledHeight = image.height / image.width * scaledWidth;
                                
                    // Bug:rotating the angle can sometimes cause a page crash because image load is long and call is asynchronously
                    // I think this is causing next image to catch up and 2 x save/translate/rotations to clash, hitting a memory error?
                    // Tip: keep images small or implement a MutEx Semaphore?
                    context.save();  
				
					// find a comment (if there is one) for the image
					//
					comment = window.mediaCanvas.getCommentForImage( mediafile, album );

					// save position and shape (roughly! i.e. pre-rotation) to help click detection for actions
					var finalXPos = xpos+(scaledWidth/2); 
					var finalYPos = ypos+0.5*(scaledHeight/2);
									
					// save details on image for sidebar matching
					//					
					window.mediaCanvas.saveImagePosition( mediafile, finalXPos, finalYPos, scaledWidth, scaledHeight, comment );
					
                    context.translate(finalXPos, finalYPos);

                    switch(orientation){
                    case 1:
                        // i'm fine - leave me as is
                    break;
                    case 3:
                        // 180° rotate right
                        context.rotate(Math.PI);
                    break;
                    case 6:
                        // 90° rotate right
                        context.rotate(0.5 * Math.PI);
                        rotatedPhoto= true;
                        //ctx.translate(0, -canvas.height);
                    break;
                    default:
                        console.log( "failed to handle orientation " + orientation + " - how do i look?");
                        break;
                    }   

                    context.rotate(rotationAngle);

                    

                    // draw the photo outline
                    window.mediaCanvas.shadowOn( true );
                    
                    // if photo got rotated, padding for text should go on height axis instead
                    if( !rotatedPhoto ) {
                        context.fillStyle = "#EEEEEE";
                        context.fillRect( -(scaledWidth/2)-7, -(scaledHeight/2)-7, scaledWidth+14, scaledHeight+30);

                        window.mediaCanvas.shadowOn( false );
						
						// write the comment slightly in from bottom left of polaroid, in dark dark grey
						context.fillStyle = "#222222";                                                                                
                        context.fillText( comment, scaledWidth/2*-1+0, scaledHeight/2-0 );
						
						// write the time taken slightly in absolute bottom right of polaroid, in lighter grey
                        context.fillStyle = "#888888";                                                                                
                        context.fillText( dateTaken, scaledWidth/2-85, scaledHeight/2+2 );

                    }
                    else {   
                        context.fillStyle = "#EEEEEE";
                        context.fillRect( -(scaledWidth/2)-7, -(scaledHeight/2)-7, scaledWidth+30, scaledHeight+14);

                        window.mediaCanvas.shadowOn( false );
                        context.fillStyle = "#888888";
                        // looks sideways!... context.fillText( dateTaken, scaledWidth/2-3, scaledHeight/2-70 );
                    }


                    window.mediaCanvas.shadowOn( false );

                    
                    // now draw the photo itself            
                    context.drawImage(image, 0, 0, image.width, image.height, -(scaledWidth/2), -(scaledHeight/2), scaledWidth, scaledHeight );

                    // src="http://localhost:8080/PhotoShow/test_images/media/Hugo.mp4" type='video/mp4; codecs="avc1.42E01E, mp4a.40.2"'/>
                    //context.drawImage("hugo", 0, 0, image.width, image.height, -(scaledWidth/2), -(scaledHeight/2), scaledWidth, scaledHeight );

                    
                    context.restore();
                    
                });

                // call the recursive method
                //requestAnimationFrame( this.showMedia );
            }

            image.src = URL.createObjectURL(http.response);

            } // end status 200

        }; // end http onload

        http.send();
       

        this.setState({elapsed: new Date() - this.props.start});
        
    },



    togglePlayPause: function() {
        
        if( this.state.playOrPauseAction == "Play" ) {
            this.timer = setInterval(this.showMedia, 4000);
            this.setState({playOrPauseAction: "Pause"});
            console.log( "(re)starting photo show");
        } else {
            window.mediaCanvas.pauseShow();
        }

    },

	
	pauseShow: function() {
		clearInterval(this.timer);
        this.setState({playOrPauseAction: "Play"});
        console.log( "stopping photo show")
	},

	
    /**
     * Shuffle the indexes to the media list array, or resort them if we want to move back to unshuffled mode
     */
    toggleShuffle: function() {
        if( this.state.shuffleOrUnshuffleAction == "Shuffle" ) {            
            console.log( "shuffling media")

            var j, x, i;
            for (i = this.state.indexArray.length; i; i--) {
                j = Math.floor(Math.random() * i);
                x = this.state.indexArray[i - 1];
                this.state.indexArray[i - 1] = this.state.indexArray[j];
                this.state.indexArray[j] = x;
            }

            this.setState({shuffleOrUnshuffleAction: "Unshuffle"});

        } else {                         
            // whatever indexes are still remaining, we sort them again           
            console.log( "unshuffling media")
            this.state.indexArray.sort(function (a, b) {  return a - b;  });

            this.setState({shuffleOrUnshuffleAction: "Shuffle"});
        }

    },


    shadowOn: function( on ) {
        var canvas = document.getElementById( 'mediaview' );
        var context = canvas.getContext('2d');

        if( on ) {
            context.shadowOffsetX = 2;  
            context.shadowOffsetY = 4;
            context.shadowColor = 'black';
            context.shadowBlur = 8;            
        }
        else {
            context.shadowOffsetX = 0;  
            context.shadowOffsetY = 0;
            context.shadowColor = 'black';
            context.shadowBlur = 0;
        }

    },


	/**
	 * Return the comment from the cash for a given image.
	 * Used to show on polaroid canvas and stored against image and position for sidebar
	 */	 
	getCommentForImage: function( mediaFile, album ) {
		
		if( !album.comments || album.comments.length <= 0 ) {
            console.log( "cant find any comments (at all!?)"  );
            return "";
		}
		
		// look for and return comment if found
		for(var i=0; i < album.comments.length; i++) {			
		
			// match on file name only, not on directory etc. as that could change
			// split it based on folder seperator and take last val in array
			//
			a = mediaFile.split('/');
			thisMediaFile = a[a.length-1];
			
			a = album.comments[i].media_filename.split('/');
			commentedMediaFile = a[a.length-1];			
			
			// have a trailing " sometimes, so cheat with startsWith...
			if( commentedMediaFile.startsWith (thisMediaFile) ) {				
				console.log( "found comment for " + thisMediaFile + " at " + i + ": " + album.comments[i].comment.comment_text);
				return album.comments[i].comment.comment_text.replace("\"", "");
			}			
			
		}
		
		return "";
					
	},
	
	
	/** 
	 * As an image is displayed save the image file and location details for later retrieval on a user event (e.g. mouse click)
	 */
	saveImagePosition: function( mediaFile, finalXPos, finalYPos, scaledWidth, scaledHeight, cmt ) {
					
        // if we havent started tracking images yet, start doing so now 
        if( !this.state.imageLocations || this.state.imageLocations.length <= 0 ) {
            console.log( "creating image location cache"  );
            
            imageLocations = new Array();
            this.setState({ imageLocations: imageLocations });
		}
		
		// if we exceed 4 items in cache, we'll prune the oldest before adding the next
		// @TODO: this only works because we've hardcoded showing images in 4 sections. 
		// So there is bad coupling here!
		if( this.state.imageLocations.length >= 4 ) {
			this.state.imageLocations.shift();
		}
					
		// create and add the image details to the array		
		this.state.imageLocations.push( { imageDisplayed:mediaFile, X:finalXPos, Y:finalYPos, width:scaledWidth, height:scaledHeight, comment:cmt } );
		
		
	},
	
	
	/** 
	 * get an image corresponding to given location
	 */
	getImageAtPosition: function( X, Y ) {		 		 	
		
		for(var i=0; i < this.state.imageLocations.length; i++) {
			
			canvasImage = this.state.imageLocations[i];
			console.log('checking ' + canvasImage.X + ', ' + canvasImage.Y + ' width:' + canvasImage.width + ' height:' + canvasImage.height );	
						
			// this is crude but given limited rotation and the fact we dont allow clicking of media hiding behind other media, is good enough...?
			// note final canvasImage.X & canvasImage.Y are the centre not the top-left
			//
			if( (canvasImage.X - canvasImage.width/2) < X && (canvasImage.X + canvasImage.width/2) > X &&
				(canvasImage.Y - canvasImage.height/2) < Y && (canvasImage.Y + canvasImage.height/2) > Y ) {
			
				console.log( 'User hit: (' + X + ', ' + Y + ') which is on ' + canvasImage.imageDisplayed );			
						
                return canvasImage;
			}
			
			// or return silently - nothing clicked			
        }

	},
	
	
		
	// ----------- HANDLE INTERACTIONS -------------------
		
	handleClick: function(e) {
		
		var x = e.clientX;
		var y = e.clientY;
		
		// handle ipad touches?
		if( event.touches && event.touches.length > 0 ) {
			x = event.touches[0].pageX;
			y = event.touches[0].pageY;
		}
		
		console.log('identifying photo at (' + x + ', ' + y + ')' );		
		
		clickedImage = this.getImageAtPosition( x, y );
		
		if( clickedImage ) {
			this.pauseShow();
			console.log('process user click of ' + clickedImage.imageDisplayed );
						
			var currentComment = clickedImage.comment;
			//clickedImage.comment = prompt("Enter comment", currentComment );
			
			this.showSidebar( clickedImage );
			
			//console.log('saving comment [' + clickedImage.comment + '] against image ' + clickedImage.imageDisplayed );			
			//this.togglePlayPause();			
		}		
	},
	

	handleDoubleClick: function(e) {
		//console.log('identifying photo at (' + e.clientX + ', ' + e.clientY + ')' );							
		// no double click action
	},
	

	refCallback: function(item) {
		if (item) {
			item.getDOMNode().ondblclick = this.handleDoubleClick;
		}
	},
  
  
	/** 
	 * get an image corresponding to given location
	 */
	showSidebar: function( clickedImage ) {		 	
		
		console.log( "opening sidebar for " + clickedImage.imageDisplayed );
				
		if( document.getElementById("mySidenav") !== null && document.getElementById("main") !== null ) {
			document.getElementById("mySidenav").style.width = "250px";
			document.getElementById("main").style.marginLeft = "250px";
			document.body.style.backgroundColor = "rgba(0,0,0,0.4)";
		}
		
		
		var details = <ClickedImageDetails data={clickedImage} />;
        React.render(details, document.getElementById('mySidenav'));		
	},
	
	
	
	closeSidebar: function() {

		console.log( "closing sidebar" );
		
		if( document.getElementById("mySidenav") !== null && document.getElementById("main") !== null ) {
			document.getElementById("mySidenav").style.width = "0px";
			document.getElementById("main").style.marginLeft = "0px";
			document.body.style.backgroundColor = "white";
		}

		this.togglePlayPause();
		
	},
	

	
	// ------------- END HANDLE INTERACTIONS-------------
	
	
    render: function() {
        // changing this to 100% as opposed to {xxx} caused images to stop rendering
        // find out why!?
        return ( <div>
		
					<div id="mySidenav" className="sidenav"></div>
					
					<div id="main">
						<canvas id="mediaview" width={900} height={600} onClick={this.handleClick} ontouchstart={this.handleClick} ref={this.refCallback} />
					</div>
					
					<div id='media-controls'>
						<center>
						<div className="btn-group">
						<button id='play-pause-button' type="button" className='btn btn-default' title='play'
							 onClick={this.togglePlayPause}>{this.state.playOrPauseAction}</button>
						<button id='shuffle-button' type="button" className='btn btn-default' title='shuffle'
							 onClick={this.toggleShuffle}>{this.state.shuffleOrUnshuffleAction}</button>
						</div>      										
						</center>
					</div>               
			</div> );
    }

/** 
 *  <video id="testVideo" autoplay controls preload="auto">
                    <source src="http://localhost:8080/PhotoShow/test_images/media/Hugo.mp4" type='video/mp4; codecs="avc1.42E01E, mp4a.40.2"'/>
                </video>				
 */
});

React.render( 
    <ShowSelector data={albums} />, document.getElementById('app')    
);


    
