# Business card designer with QR code

## Overview

A website that will allow the users to design and download business cards or company ID cards with multiple customizations options.
It will use at most version 25 of QR Code.
It will allow designing of business cards of standard sizes.
there are two options regarding the designed cards being saved for the users not logged in, they can be stored in localstorage of the user's browser, or they can be saved/cached at the server with a deletion timeout of a few hours.

## Frontend

it will be a simple website allowing designing of ONE business card for free, but for downloading a card or designing multiple cards(3) they will have to log in and for company ID cards (custom sizes), the users will have to register to a paid account.

it will at least have XXX pages:

- **landing page(public)**: an intro to the product and links to other pages.
- **Get Started**:it will show a wizard-like interface with prebuilt templates to get started with creating a card. it will also show "locked" options for people to see the potential options if they log-in or buy subscription.
- **designer page(public)**: an webapp to allow designing the card further. and adding qr codes to the card with custom content.
- **gallery(private)**: it will show the saved cards to allow editing or downloading.

## backend

it will be used for auth, anti-abuse, etc.
if possible the barcodes should be generated on backend and shown in browsers in such a way that they cannot be saved/used normally (low resolution, some watermarking, or something).
