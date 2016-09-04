/** @jsx React.DOM */

var album = {
    name: "France",
    description: "France - July 9th to 29th 2016",
    media: [ ]
};


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
            FB.login(function (response) {
                console.log( "authenticating with facebook using ARN " + roleArn );                
                bucket.config.credentials = new AWS.WebIdentityCredentials({
                    ProviderId: 'graph.facebook.com',
                    RoleArn: roleArn,
                    WebIdentityToken: response.authResponse.accessToken
                });
                
                fbUserId = response.authResponse.userID;
                console.log( "identified FB user id " + fbUserId );                
      
            /**
             * Now connect to S3 bucket
             */
            prefix = 'facebook-' + fbUserId;
            console.log( "getting S3 objects from " + prefix );

            bucket.listObjects({
                Prefix: prefix
            }, function (err, data) {        
                if (err) {
                    console.error( "failed to load images from " + prefix + ". ERROR: '" + err );
                } else {                    
                    data.Contents.forEach(function (obj) {

                        // ignore directory
                        if( obj.Key.endsWith("JPG") || obj.Key.endsWith("jpg") || obj.Key.endsWith("jpeg") || 
                            obj.Key.endsWith("png") || obj.Key.endsWith("bmp") ) {                        
                            console.log( "adding media file "+ obj.Key + " to list of " + this.album.media.length  );
                            this.album.media.push(obj.Key);
                        }                        
                    });
                    
                    //console.log( "added " + this.album.media.length + " for display" );
                    //var url = bucket.getSignedUrl('getObject' );                    
                }
            });  


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
            <MediaCanvas description={this.props.data.description} medialist={this.props.data.media} />
            </div> 
        );
    }

});



var MediaCanvas = React.createClass({

    getInitialState: function() {
        return { index: -1 };   // for indexing the photos
    },


    componentDidMount: function() {        
        // JS methodrequestAnimationFrame added to allow smooth optimised updating of graphics (60fps) 
        // MIGHT USE THIS LATER - NOT FOR PHOTOS THOUGH
        //var aid = requestAnimationFrame( this.showMedia.bind(this) );
        //this.setState({ animationId: aid });

        // set interval for the timer between showing photos
        this.timer = setInterval(this.showMedia, 3000);
        
        var canvas = document.getElementById( 'mediaview' );
        var context = canvas.getContext('2d');        
        
        var description = this.props.description;
        
        context.fillStyle = "#EEEEEE";
        context.strokeStyle= "#444444";
        context.lineWidth = 2;        


        var background = new Image();
        background.src = "https://s3-eu-west-1.amazonaws.com/khphotoshow/backgrounds/black_table_background.jpg";

        background.onload = function(){
            context.drawImage(background,0,0);

            //context.globalAlpha = 0.5;
            //context.font = "Comic Sans MS";
            context.font = "20px Sans Serif";
            context.textBaseline = "top";
            context.fillStyle = "#DDDDDD";            
            //context.fillText( "hello", 20, 20 );
            context.fillText( description, 20, 20 );
            //context.globalAlpha = 1.0;   
        }
        
    },


    componentWillUnmount: function(){
        clearInterval(this.timer);

        // this one helps reset to 0 on reload of the screen
        this.setState({ index: -1 });
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
        var thumbnail = document.getElementById('thumbnail');                        
        
        this.setState({ index: this.state.index + 1 });

        // if we're at the end of the media list, do nothing
        // might I get a race condition here if animation id hasnt been saved in state yet above
        if( this.state.index >= this.props.medialist.length ) {
            console.log( "no more media"  );
            this.setState({ index: -1 });
            //clearInterval(this.timer);
            //cancelAnimationFrame( this.state.animationId )
            return;
        }
                    
        // otherwise show the next image...
        mediafile =  "https://s3-eu-west-1.amazonaws.com/khphotoshow/" + this.props.medialist[this.state.index];
        console.log( "showing image " + this.state.index + " of " + this.props.medialist.length + ": " + mediafile );

        // max X coord is 40% across the screen given how we scale images to 60% of screen
        var maxX = Math.floor( canvas.width * 0.4 );
        var maxY = Math.floor( canvas.height * 0.4 );
        var xpos = Math.floor((Math.random() * maxX) + 1); 
        var ypos = Math.floor((Math.random() * maxY) + 1);


        // we'll rotate up to 5 deg max, and flip it half the time to negative
        //var rotationAngle = Math.floor((Math.random() * 5) + 0) * Math.PI / 180;
        var rotationAngle = 0.01;
        if( Math.floor((Math.random() * 2) + 1) == 2 )
            rotationAngle = rotationAngle * -1;

        image = new Image();
  	    image.src = mediafile;
        thumbnail.innerHTML = "<img src='" + mediafile + "' width=50 height=50/>";

          // might have issues later from having commented this callback approach out, but was losing reference
          // to "this" which was stopping me call requestAnimationFrame again from within.
          // I should be using interval anyway not animation right - so use this instead and reinstate onload?
          // http://jsfiddle.net/martinaglv/3fZT2/

        image.onload = function(){

            // scale the image down if we have to, to X% of the canvas real estate.        
            var scale = 0.6;     
            var width = canvas.width * scale;
            var height = image.height / image.width * width;
            /* If both dimensions are smaller than the canvas
            if( image.width < canvas.width && image.height < canvas.height ) {
                width = image.width;
                height = image.height;
            }
            */

            console.log( "drawing image at (" + xpos + "," + ypos + ") of width " + width + " x " + height + " at angle " + rotationAngle );

            // ISSUE - translating to centre of image (using width or image.width) is causing weird problems
            // I THINK due to original images being so huge compared to what I scale them down to be
            //
            // I cant rotate the angle without creating a page crash!!!
            context.save();  
            context.translate(xpos+0.5*image.width,ypos+0.5*image.height);
            //context.rotate(rotationAngle);

            // draw the photo outline
            context.shadowOffsetX = 2;  
            context.shadowOffsetY = 4;
            context.shadowColor = 'black';
            context.shadowBlur = 8;
            //context.fillRect( xpos-7, ypos-7, width+14, height+14);
            context.fillRect( -0.5*image.width-7, -0.5*image.height-7, width+14, height+14);


            context.shadowOffsetX = 0;  
            context.shadowOffsetY = 0;
            context.shadowColor = 'black';
            context.shadowBlur = 0;
            // now draw the photo itself
            //context.drawImage(image, 0, 0, image.width, image.height, xpos, ypos, width, height );
            context.drawImage(image, 0, 0, image.width, image.height, -0.5*image.width, -0.5*image.height, width, height );

            context.restore();
            // call the recursive method
            //requestAnimationFrame( this.showMedia );
        }

        this.setState({elapsed: new Date() - this.props.start});
        
    },


    render: function() {
        // changing this to 100% as opposed to {xxx} caused images to stop rendering
        // find out why!?
        return <center><canvas id="mediaview" width={900} height={600} /></center>;
    }


});


React.render( 
    <PhotoShow data={album} />, document.getElementById('app')
);
    
