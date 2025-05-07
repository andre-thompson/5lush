//node packages
const express = require("express");
const dotenv = require('dotenv').config({ path: './api.env'});
const querystring = require('querystring');
const cors = require('cors');
const crypto = require('crypto');
const spotify = require('spotify-web-api-node');
const axios = require('axios');
const session = require('express-session');
//spotify api info
const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSECRET = process.env.SPOTIFY_CLIENT_SECRET;

const redirect_uri = 'https://5lush.com/spotify-api/callback';
const spotifyAPI = new spotify({
	clientId: clientID,
	clientSecret: clientSECRET,
	redirectUri: redirect_uri

});

//start server
const app =  express();
const PORT = 3000;
app.use(cors());
app.use(session({
	secret: 'your-secret-key',
	resave: false,
	saveUninitialized: true,
	cookie: { 
		secure: true,
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 24 * 60 * 60 * 1000;
	}
}));
//login

app.get('/login',(req,res)=>{
	const scopes = ['user-read-private', 'user-read-email', 'user-read-playback-state', 'user-modify-playback-state'];
	const state = crypto.randomBytes(16).toString('hex');
	res.cookie('spotify_auth_state', state);
	res.redirect(spotifyAPI.createAuthorizeURL(scopes, state));

})

//callback

app.get('/callback', async (req,res) => {
	try {
		const code = req.query.code;
		if(!code) throw new Error('No code');
		const data = await spotifyAPI.authorizationCodeGrant(code);
		const { access_token, refresh_token, expires_in } = data.body;

		spotifyAPI.setAccessToken(access_token);
		spotifyAPI.setRefreshToken(refresh_token);
		
		req.session.spotifyAccessToken = access_token;
		req.session.spotifyRefreshToken = refresh_token;
		req.session.spotifyTokenExpires = Date.now() + (expires_in * 1000);
		
	


		req.session.save(() => {
			res.redirect('/spotify-api/dashboard');
		});
	}catch (error) {
		console.error('auth error', error);

	}
});


app.get('/dashboard',(req,res)=> {
	const accessToken = req.session.spotifyAccessToken;
	 res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success-banner {
          background-color: #1DB954; /* Spotify green */
          color: white;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .player-container {
          margin-top: 30px;
        }
        button {
          background-color: #1DB954;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-banner" id="successBanner">
          ✓ Successfully connected to Spotify!
        </div>
        
        <h1>Welcome to Your Dashboard</h1>
        ${accessToken}
        
    </body>
    </html>
  `);	



});



//random string function
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = crypto.getRandomValues(new Uint8Array(length));

  return result.reduce((acc, x) => acc + possible[x % possible.length], "");

}

//hash function

const sha256 = async(plain) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return window.crypto.subtle.digest('SHA-256',data)


}

//base64 encode
/*
const base64encode = (input) => {
	return btoa(String.fromCharCode(...new Uint8Array(input)))
	.replace(/=/g, '')
	.replace(/\+/g, '-')
	.repalce(/'/'\/g, '_');

}
*/

app.get('test', async(req, res) => {
	res.send("working!");


});



const getToken = async () => {
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${clientID}:${clientSECRET}`).toString('base64')
            },
            body: new URLSearchParams({ 'grant_type': 'client_credentials' }),
        });

        if (!response.ok) throw new Error(`Failed to fetch token: ${response.statusText}`);

        const data = await response.json();
	return data.access_token;
    } catch (error) {
        console.error("Error fetching Spotify token:", error);
        return null;
    }
};

const getTopTracks = async () => {
	const token = await getToken();
        	try {
                	const response = await fetch('https://api.spotify.com/v1/artists/0wScycodqXdKbQ0d4O7qdX/top-tracks', {
                        	method: 'GET',
                        	headers: {
                                	'Content-Type': 'application/json',
					'Authorization':`Bearer ${token}`
                        	},	
                	});
                	if (!response.ok) throw new Error(`Failed to fetch artists: ${response.statusText}`);
                	const data = await response.json();
                	return data;
        	} catch (error) {
                	console.error("Error fetching Spotifiy artists:", error);
                	return null;
        	}

};

const getPlaylists = async (userID) => {

	const token = await getToken();	
		try {
			 const response = await fetch(`https://api.spotify.com/v1/users/${userID}/playlists`, {
				method: 'GET',
                		headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization':`Bearer ${token}`
                                },

			});
			 
                         const data = await response.json();
                         return data;
                } catch (error) {
                        console.log("Error fetching Spotifiy artists:", error);
                }
};
const getPlaylistTracks = async (playlistID) => {
	 const token = await getToken();
                try {
                         const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks`, {
                                method: 'GET',
                                headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization':`Bearer ${token}`
                                },

                        });
                         if (!response.ok) throw new Error(`Failed to fetch artists: ${response.statusText}`);
                         const data = await response.json();
                         return data;
                } catch (error) {
                        console.error("Error fetching Spotifiy artists:", error);
                        return null;
                }

};

const parsePlaylistObject = async (playlists) => {
	var parsedArray = [];
	const regex = /playlists\/([^\/]+)/;
	playlists.items.forEach((item) => { 
		const playlistID = item.href.match(regex)[1];
		parsedArray.push(playlistID);
	}); 
	return parsedArray;
};

const collectPlaylistObjects = async(parsedPlaylist) => {
	var parsedArray = [];
	for (const item of parsedPlaylist) {
		const trackObject = await getPlaylistTracks(item);
		parsedArray.push(trackObject);
	}
	return parsedArray;
};

const parseTopArtists = async(playlists) => {
	const artistMap = new Map();
	const songMap = new Map();
	
	playlists.forEach((item) => {
		item.items.forEach((song) => {
			const trackName = song.track.name;
			const artists = song.track.artists.map(artist => artist.name);
		
			if(songMap.has(trackName)){
				const songData = songMap.get(trackName);
				songData.count += 1;
				songMap.set(trackName, songData);
			} else {
				songMap.set(trackName, {count: 1, song: song});
				
			}	
			artists.forEach((artist) => {
				if (artistMap.has(artist)) {
					const artistData = artistMap.get(artist);
					artistData.count += 1;
					artistMap.set(artist, artistData);
				} else {
					artistMap.set(artist, {count: 1, song: song});
				}
			
			
			});
		});
	});


	
	const artistArray = Array.from(artistMap);
	const songArray = Array.from(songMap);
	
	return [artistArray, songArray];
};

const Merge = (map, leftHead, leftTail, rightHead, rightTail) => {
	var size = rightTail - leftHead +1;
	var mergedList = new Array(size);
	var mergePos = 0;
	var leftPos = leftHead;
	var rightPos = rightHead;
	while (leftPos <= leftTail && rightPos <= rightTail) {
		if(map[leftPos][1].count <= map[rightPos][1].count) {
			mergedList[mergePos] = map[leftPos];
			leftPos++;
		} else {
			mergedList[mergePos] = map[rightPos];
			rightPos++;
		}
		mergePos++;
	};

	while (leftPos <= leftTail) {
		mergedList[mergePos] = map[leftPos];
		leftPos++;
		mergePos++;
	};
	
	while (rightPos <= rightTail){
		mergedList[mergePos] = map[rightPos];
		rightPos++;
		mergePos++;
	};
	for (var i = 0; i < size; i++){
		map[leftHead + i] = mergedList[i];
	}
};


const MergeSort = (map, startIndex, endIndex) => {
	if(startIndex < endIndex) {
		var mid = Math.floor((startIndex + endIndex) / 2);
		MergeSort(map, startIndex, mid);
		MergeSort(map, mid+1, endIndex);
		Merge(map, startIndex, mid, mid+1, endIndex);
	}

};

const TopTen = (array) => {
	let newArray = [];
	for(let i = array.length -1; i > (array.length-11); i--){
                newArray.push(array[i]);

        }
	return newArray;

};
const searchUsername = async (username) => {
	const token = await getToken(); 
	try {
        	const response = await fetch(`https://api.spotify.com/v1/users/${username}`, {
                method: 'GET',
                headers: {
                        	'Content-Type': 'application/json',
                                'Authorization':`Bearer ${token}`
                        },

                });
                	if (!response.ok) throw new Error(`Failed to fetch artists: ${response.statusText}`);
                        const data = await response.json();
                        return data;
        } catch (error) {
                console.error("Error fetching Spotifiy artists:", error);
                return null;
        }
	


};
app.get('/top_five', async (req, res) => {
	const topTracks = await getTopTracks();
	res.json(topTracks);
});
app.get('/searchUser', async (req, res) => {
	const username = await searchUsername('nuzxyz');
	res.json(username);

});
app.get('/top_songs', async (req, res) => {
	const user = req.query.user;
	const playlists = await getPlaylists(`${user}`);
	if(playlists.error){
		res.json(playlists);
	} else {
		const userProfile = await searchUsername(user);
		const parsedPlaylists = await parsePlaylistObject(playlists);
		const playlistTrackObjectContainer = await collectPlaylistObjects(parsedPlaylists);
		const topSongs_Artists = await parseTopArtists(playlistTrackObjectContainer);
	
		let topSongs = topSongs_Artists[1];
		let topArtists = topSongs_Artists[0];
	
		MergeSort(topSongs,0, topSongs.length -1);
		MergeSort(topArtists, 0, topArtists.length -1);
	
		topSongs = TopTen(topSongs);
		topArtists = TopTen(topArtists);
	
	
		res.json({
			topSongs,
			topArtists,
			userProfile
		});
	}
});

app.get('/playlist', async (req, res) => {
	const playlist = await getPlaylistTracks('4tK1JS06cO9YLOYXVL8Jjz');
	res.json(playlist);

});
app.listen(PORT, '0.0.0.0', () => {
	console.log("Server is listening on port: " + PORT);
});






 
