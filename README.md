#OverView of the Project

SlotSwapper is a peer-to-peer time-slot swapping app. Users mark busy calendar slots as SWAPPABLE and can request swaps with other users’ swappable slots. Swap acceptance swaps ownership of the two slots atomically and updates statuses.


Stack used in this reference implementation:
Backend: Node.js + Express
Database: MongoDB (with transactions where possible)
Auth: JWT
Frontend: React (Create React App)
This README assumes that stack. Adapt commands if you used a different stack.


Table of contents
Features
Data model (schemas)
API endpoints (complete)
Authentication
Swap logic (the core)
Frontend overview (routes & behavior)
Environment variables
Local setup — backend and frontend
Tests
Deployment notes
Assumptions & design choices
Known limitations & improvements
Submission checklist



1 — Features (what works)

Sign Up / Log In with email/password
JWT-protected APIs
CRUD for events (create / read / update / delete)
Mark event statuses: BUSY, SWAPPABLE, SWAP_PENDING
Marketplace: list of other users’ SWAPPABLE slots
Create swap request (mySlotId → theirSlotId)
Respond to swap request (accept / reject)
Atomic swap on accept: owners exchanged, statuses updated to BUSY
Notifications view endpoints (incoming / outgoing requests)
Frontend: Dashboard (my events), Marketplace, Notifications
State updates immediately on successful operations (front-end updates)


2 — Data model (schemas)
Below are the main collections/tables used. Field names are exact for clarity.
users
{
  "_id": ObjectId,
  "name": "Priya",
  "email": "priya@example.com",
  "passwordHash": "<bcrypt-hash>",
  "createdAt": ISODate,
  "updatedAt": ISODate
}

events (slots)
{
  "_id": ObjectId,
  "title": "Team Meeting",
  "startTime": ISODate,
  "endTime": ISODate,
  "status": "BUSY" | "SWAPPABLE" | "SWAP_PENDING",
  "ownerId": ObjectId,   // reference to users._id
  "metadata": { ... },   // optional (location, notes)
  "createdAt": ISODate,
  "updatedAt": ISODate
}

swapRequests
{
  "_id": ObjectId,
  "fromUserId": ObjectId,       // requester
  "toUserId": ObjectId,         // owner of theirSlotId
  "mySlotId": ObjectId,         // slot offered by requester
  "theirSlotId": ObjectId,      // slot requested from other user
  "status": "PENDING" | "ACCEPTED" | "REJECTED",
  "createdAt": ISODate,
  "updatedAt": ISODate
}


3 — API endpoints (full list & examples)
All protected endpoints require Authorization: Bearer <JWT> header (except /auth/*).

Auth

POST /api/auth/signup
Body: { "name", "email", "password" }
Returns: { token, user }

POST /api/auth/login
Body: { "email", "password" }
Returns: { token, user }

Events (Slots) — protected

GET /api/events
Returns: list of events owned by current user.

GET /api/events/:id
Returns specific event (only if owner).

POST /api/events
Body: { title, startTime, endTime, status? }
Creates event. Default status: BUSY.

PUT /api/events/:id
Body: any event fields to update — including status (use to flip BUSY ↔ SWAPPABLE).

DELETE /api/events/:id

Marketplace

GET /api/swappable-slots
Returns all events where status == "SWAPPABLE" and ownerId != currentUserId.
Query params optional: ?limit=20&page=1&fromTime=&toTime=.

Swap Requests

POST /api/swap-request
Body: { mySlotId, theirSlotId }
Behavior:

Verify both slots exist.
Verify both are SWAPPABLE.
Verify mySlot.ownerId == currentUserId and theirSlot.ownerId != currentUserId.
Create swapRequests document with status PENDING.
Update both events' status => SWAP_PENDING (atomic if DB supports transactions).
Return the created request.

Example cURL:

curl -X POST /api/swap-request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mySlotId":"<myId>","theirSlotId":"<theirId>"}'


POST /api/swap-response/:requestId
Body: { accept: true | false }
Behavior:

Only toUserId (owner of theirSlot) can respond.

If accept === false:

Set SwapRequest.status = REJECTED

Set both events' status back to SWAPPABLE
If accept === true:
Must perform an atomic transaction:
Swap ownerId values of the two events.
Set both events' status = BUSY
Set SwapRequest.status = ACCEPTED
Return success and updated events.

Example cURL:

curl -X POST /api/swap-response/60abc... \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accept": true}'

Notifications / Requests

GET /api/swap-requests/incoming — all swapRequests where toUserId == currentUserId

GET /api/swap-requests/outgoing — all swapRequests where fromUserId == currentUserId

GET /api/swap-requests/:id — details




6 — Frontend overview (what to build & behavior)

Routes:
/auth/signup — sign-up form

/auth/login — login form

/dashboard — list of my events with controls:
Create event
Mark event SWAPPABLE / BUSY
Delete or edit event

/marketplace — list of swappable slots (from other users)
Each entry: Request Swap → opens modal showing your SWAPPABLE slots to offer.


/notifications — two lists:
Incoming requests: show request details + Accept / Reject buttons
Outgoing requests: show status (PENDING / ACCEPTED / REJECTED)
Protected routes should check JWT and redirect to login if invalid/expired.


State management:
Use React Context or a small state container (Redux optional).
After any mutation (create request / accept / reject) update local state immediately using the API response.
Poll or use WebSockets for real-time updates (bonus).


UX notes:
Prevent user from offering the same slot for multiple requests by disabling already SWAP_PENDING ones in UI.
Show clear error responses from backend (400/401/403/409) and display them.



7 — Environment variables 
Backend:
PORT=4000
MONGO_URI=mongodb://localhost:27017/slotswapper
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10


Frontend:
REACT_APP_API_URL=http://localhost:4000/api



8 — Local setup
Prerequisites
Node.js v18+ (or LTS)
npm 
MongoDB running (local or Atlas). For MongoDB transactions you need a replica set.


Backend (example)
# in /backend
cp .env.example .env    # edit environment variables
npm install
npm run migrate        # optional, if migrations implemented
npm run dev            # starts server on PORT
# or
node dist/index.js


Frontend (example)
# in /frontend
cp .env.example .env
npm install
npm start              
# runs on http://localhost:3000


Run order: Start backend first, then frontend.
