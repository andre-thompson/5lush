//node packages
const express = require("express");
const dotenv = require('dotenv').config({ path: './api.env'});
const querystring = require('querystring');
const cors = require('cors');
const crypto = require('crypto');
//spotify api info
const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSECRET = process.env.SPOTIFY_CLIENT_SECRET;
//redirect
const redirect_uri = 'https://5lush.com/budget_wrapped';
//start server
const app =  express();
const PORT = 3000;
app.use(cors());

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
app.get('/login', async (req, res) => {
	const codeVerifier = generateRandomString(64);
	const hashed = await sha256(codeVerifier);
	const codeChallenge = base64encode(hashed);

	const scope = 'user-read-private user-read-email';
	const authUrl = new URL("https://accounts.spotify.com/autohrize");

	window.localStorage.setItem('code_verifier', codeVerifier);

	const params = {

	}

});
app.get('/playlist', async (req, res) => {
	const playlist = await getPlaylistTracks('4tK1JS06cO9YLOYXVL8Jjz');
	res.json(playlist);

});
app.listen(PORT, () => {
	console.log("Server is listening on port: " + PORT);
});






 
