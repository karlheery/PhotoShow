        /* HERE's THE CONFIG FOR KH's AP */

        // PROD 
        //var appId = '754651064672675';
        // DEV
        var appId = '757081597762955';


        var roleArn = 'arn:aws:iam::827454618391:role/PhotoShowRole';
        var bucketName = 'khphotoshow';
        AWS.config.region = 'eu-west-1';

        var fbUserId;
        var bucket = new AWS.S3({
            params: {
                Bucket: bucketName
            }
        });

        
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
                bucket.config.credentials = new AWS.WebIdentityCredentials({
                    ProviderId: 'graph.facebook.com',
                    RoleArn: roleArn,
                    WebIdentityToken: response.authResponse.accessToken
                });

                fbUserId = response.authResponse.userID;                
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

