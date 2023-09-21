const express = require('express');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const url = require('url');


const app = express();
const PORT = 3000;


const CLIENT_ID = '439316653208-1c5jf46ts4pd79b3scpcn51v78qajdbc.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);


app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email', 
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/contacts.readonly',
      ],
  });
  res.redirect(authUrl);
});



app.get('/oauth2callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (code) {
      const { tokens } = await oauth2Client.getToken(code);

      
     
      oauth2Client.setCredentials(tokens);
      
     
      res.redirect('/success');
    } else {
      res.status(400).send('Missing authorization code');
    }
  } catch (error) {
    console.error('Error during token exchange:', error);
    res.status(500).send('Token exchange failed');
  }
});

app.get('/events', async (req, res) => {
  try {
    
    const calendarId = 'shubham.kumar@kalvium.community'; 

    const calendar = google.calendar('v3');
    const eventsListResponse = await calendar.events.list({
      auth: oauth2Client,
      calendarId: calendarId,
    });

    const events = eventsListResponse.data.items;

    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error fetching events');
  }
});


app.get('/success', async (req, res) => {
    try {
      
      const calendar = google.calendar('v3');
      const calendarListResponse = await calendar.calendarList.list({
        auth: oauth2Client,
      });
      
      const calendars = calendarListResponse.data.items;
  
     
      res.json({ calendars });
    } catch (error) {
      console.error('Error fetching calendar metadata:', error);
      res.status(500).send('Error fetching calendar metadata');
    }
  });
  app.get('/email-metadata', async (req, res) => {
    try {
     
      const people = google.people('v1');
      const profileResponse = await people.people.get({
        auth: oauth2Client,
        resourceName: 'people/me',
        personFields: 'emailAddresses',
      });
  
      const emailAddresses = profileResponse.data.emailAddresses;
  
      res.json({ emailAddresses });
    } catch (error) {
      console.error('Error fetching email metadata:', error);
      res.status(500).send('Error fetching email metadata');
    }
  });
  
  
  app.get('/email-messages', async (req, res) => {
    try {
      
      const messagesListResponse = await google.gmail('v1').users.messages.list({
        auth: oauth2Client,
        userId: 'me',
        q: 'is:inbox', 
      });
  
      const messages = messagesListResponse.data.messages;
  
      
      const emailDetails = [];
  
      for (const message of messages) {
        const messageDetails = await google.gmail('v1').users.messages.get({
          auth: oauth2Client,
          userId: 'me',
          id: message.id,
          format: 'full', 
        });
  
        const email = messageDetails.data;
  
        // Extract sender, receiver, and subject
        const headers = email.payload.headers;
        const sender = headers.find(header => header.name === 'From').value;
        const receiver = headers.find(header => header.name === 'To').value;
        const subject = headers.find(header => header.name === 'Subject').value;
  
       
        let emailBody = '';
  
        
        if (email.payload.parts && email.payload.parts.length > 0) {
          for (const part of email.payload.parts) {
            if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
              emailBody += Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
          }
        } else {
          
          emailBody = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
        }
  
        emailDetails.push({
          sender,
          receiver,
          subject,
          emailBody,
        });
      }
  
      res.json({ emailDetails });
    } catch (error) {
      console.error('Error fetching email messages:', error);
      res.status(500).send('Error fetching email messages');
    }
  });
  
  
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
