/** @jsx React.DOM */

var albums = [{
        name: "France",
        background: "https://s3-eu-west-1.amazonaws.com/khphotoshow/backgrounds/france_background.jpg",
        description: "",
        basedir: "https://s3-eu-west-1.amazonaws.com/khphotoshow/",
        mediadir: "France",
        medialist: []
    },
    {
        name: "General 2016",
        background: "https://s3-eu-west-1.amazonaws.com/khphotoshow/backgrounds/black_table_background.jpg",
        description: "General photos from rest of 2016 (yet to be categorised)",
        basedir: "https://s3-eu-west-1.amazonaws.com/khphotoshow/",
        mediadir: "2016",
        medialist: []
    }
];

// caches the chosen album - a hack as should be able to store in React state, but asynch javascript methods causing me trouble
var album = {};


/**
 * Component to choose the show we want to display
 * Presents the list based on above array of albums
 */
var ShowSelector = React.createClass({

    componentDidMount: function() {

    },

    /** 
     * Process click of album
     * I should be able to pass in and read album rather than have to search array again, right?9
     * 
     */
    startShow(e) {
        console.log( "Starting " + e.target.name + " show..." );

        // find the album again
        for(var i=0; i < this.props.data.length; i++) {
            if( this.props.data[i].name == e.target.name ) {
                album = this.props.data[i];
                this.setState({ album: this.props.data[i] });
            }
        }

        var photoShow = <PhotoShow data={album} />;
        React.render(photoShow, document.getElementById('app'));
    },

    render: function() {
        //{this.props.data.background}

        var rows = [];
        for (var i=0; i < this.props.data.length; i++) {
            rows.push( <button type="button" name={this.props.data[i].name} className="button button2"  block onClick={this.startShow.bind(this)}>{this.props.data[i].name}</button> );
        }

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

        // PROD 
        //var appId = '754651064672675';
        // DEV
        var appId = '757081597762955';

        var roleArn = 'arn:aws:iam::827454618391:role/PhotoShowRole';
        var bucketName = 'khphotoshow';
        AWS.config.region = 'eu-west-1';

        var bucket = new AWS.S3({
            params: {
             Bucket: bucketName
            }
        });
        var fbUserId;
      
      
        /*!
         * Login to your application using Facebook.
         * Uses the Facebook SDK for JavaScript available here:
         * https://developers.facebook.com/docs/javascript/gettingstarted/
         */
        window.fbAsyncInit = function () {
        FB.init({
                appId: appId
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

                // FB specific folder access
                //prefix = 'facebook-' + fbUserId;  
                prefix = 'media' // + album.mediadir;  // dont add a '/' at end it breaks it                                
                console.log( "getting S3 objects from " + prefix + "/" + album.mediadir );

                bucket.listObjects({
                    Prefix: prefix
                    }, function (err, data) {        
                        if (err) {
                            msg = "failed to load images from " + prefix + ". ERROR: '" + err;
                            console.error( msg );
                            
                            var messageArea = document.getElementById('messageArea');
                            messageArea.innerHTML = msg;                       
                
                        } else {                    
                            data.Contents.forEach(function (obj) {

                                // ignore directory
                                if( obj.Key.endsWith("JPG") || obj.Key.endsWith("jpg") || obj.Key.endsWith("jpeg") || 
                                    obj.Key.endsWith("png") || obj.Key.endsWith("bmp") ) {

                                        // check its from our desired folder
                                        // ANOTHER HACK!
                                        if( obj.Key.includes( album.mediadir ) ) {                  
                                            console.log( "adding media file "+ obj.Key + " to list of " + this.album.medialist.length  );
                                            this.album.medialist.push(obj.Key);
                                        }
                                }                        
                            });                    
                        }
                }); 

            } else {
                // the user is logged in to Facebook, but has not authenticated your app i.e. response.status === 'not_authorized'
                // or the user isn't logged in to Facebook.

                window.location.href="index.html";
                //FB.login();       // popup approach
            }
        });
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


    render: function() {
        return ( 
            <div>                        
            <MediaCanvas background={this.props.data.background}
                description={this.props.data.description} 
                basedir={this.props.data.basedir} 
                mediadir={this.props.data.mediadir}
                medialist={this.props.data.medialist} />
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
        return { index: -1, playOrPauseAction: "Pause", shuffleOrUnshuffleAction: "Shuffle" };   // for indexing the photos
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
            context.font = "20px Sans Serif";
            context.textBaseline = "top";
            context.fillStyle = "#6666BB";            
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
        mediafile =  this.props.basedir + this.props.medialist[index];
        console.log( "showing image " + index + " of " + this.props.medialist.length + ": " + mediafile + "(" + this.state.indexArray.length + " left)" );

        // max X coord is 40% across the screen given how we scale images to 60% of screen
        var maxX = Math.floor( canvas.width * 0.6 );
        var maxY = Math.floor( canvas.height * 0.6 );
        var xpos = Math.floor((Math.random() * maxX) + 1); 
        var ypos = Math.floor((Math.random() * maxY) + 1);


        // we'll rotate up to 5 deg max, and flip it half the time to negative
        var rotationAngle = Math.floor((Math.random() * 5) + 0) * Math.PI / 180;
        if( Math.floor((Math.random() * 2) + 1) == 2 )
            rotationAngle = rotationAngle * -1;


        // font setting for writing on photos
        context.font = "10px Sans Serif";
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

                EXIF.getData(image, function() {
                    var orientation = EXIF.getTag(this, "Orientation");                   
                    var dateTaken = EXIF.getTag(this, "DateTimeOriginal");
                    if( !(dateTaken === undefined || dateTaken == null || dateTaken.length <= 0) ) {
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
                                
                    // Bug:rotating the angle cab somtimes cause a page crash because image load is long and call is asynchronously
                    // I think this is causing next image to catch up and 2 x save/translate/rotations to clash, hitting a memory error?
                    // Tip: keep images small or implement a MutEx Semaphore?
                    context.save();  
                    context.translate(xpos+(scaledWidth/2),ypos+0.5*(scaledHeight/2));

                    switch(orientation){
                    case 1:
                        // i'm fine - leave me as is
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
                        context.fillStyle = "#888888";                                                                                
                        context.fillText( dateTaken, scaledWidth/2-85, scaledHeight/2-0 );
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
            console.log( "(re)starting photo show")
        } else {
            clearInterval(this.timer);
            this.setState({playOrPauseAction: "Play"});
            console.log( "stopping photo show")
        }

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



    render: function() {
        // changing this to 100% as opposed to {xxx} caused images to stop rendering
        // find out why!?
        return <center>
                <canvas id="mediaview" width={900} height={510} />
                <div id='media-controls'>
                    <div className="btn-group">
                    <button id='play-pause-button' type="button" className='btn btn-default' title='play'
                         onClick={this.togglePlayPause}>{this.state.playOrPauseAction}</button>
                    <button id='shuffle-button' type="button" className='btn btn-default' title='shuffle'
                         onClick={this.toggleShuffle}>{this.state.shuffleOrUnshuffleAction}</button>
                    </div>                         
                </div>
            </center>;
    }


});


React.render( 
    <ShowSelector data={albums} />, document.getElementById('app')    
);
    
