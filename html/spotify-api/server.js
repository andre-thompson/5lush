//node packages
const express = require("express");
const dotenv = require('dotenv').config({ path: './api.env'});
//icon api info

//spotify api info
const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSECRET = process.env.SPOTIFY_CLIENT_SECRET;

//start server
const app =  express();
const PORT = 3000;

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




app.get('/top_five', async (req, res) => {
	const topTracks = await getTopTracks();
	res.json(topTracks);
});

	



app.listen(PORT, () => {
	console.log("Server is listening on port: " + PORT);
});






 
