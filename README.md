# Tuition Fees Tracker v2

## View-Only Login

The viewer no longer needs a username or password.

On the first run, the default View Only code is:

`1234`

An Admin can change it from:

**Account → Change View-Only Code**

The code must contain exactly **4 or 6 digits**.

View-only users can:
- View records
- Search
- Filter Paid/Unpaid
- Refresh
- Logout

View-only users cannot:
- Add
- Edit
- Delete
- Change payment status
- Change payment dates

## Run

Extract the ZIP and open `index.html` in Chrome/Edge, or use VS Code Live Server.

## Important

This is a local browser prototype. The access code and records are stored in localStorage. For a real multi-device application with secure authentication and protected data, a backend/database is required.
