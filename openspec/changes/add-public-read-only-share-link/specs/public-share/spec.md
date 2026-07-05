## ADDED Requirements

### Requirement: The system SHALL let owners enable an unlisted share URL for a saved critique

Authenticated owners MUST be able to enable public sharing for one saved critique and receive a `/share/[token]` URL backed by an unguessable token stored on that critique.

#### Scenario: Owner enables sharing
- **GIVEN** an authenticated user owns a saved critique with `share_token` set to null
- **WHEN** the user enables sharing for that critique
- **THEN** the system stores a random unguessable `share_token`
- **AND** the response includes a `/share/[token]` URL for that token

#### Scenario: Non-owner cannot enable sharing
- **GIVEN** an authenticated user does not own a saved critique
- **WHEN** the user attempts to enable sharing for that critique
- **THEN** the system rejects the request without changing `share_token`

### Requirement: The system SHALL let owners revoke a shared critique URL

Authenticated owners MUST be able to revoke a previously shared critique so the old URL stops resolving immediately.

#### Scenario: Owner revokes sharing
- **GIVEN** an authenticated user owns a saved critique with a non-null `share_token`
- **WHEN** the user revokes sharing
- **THEN** the system sets `share_token` to null
- **AND** future requests for the previous `/share/[token]` URL return not found

### Requirement: The system SHALL expose only opted-in critiques through public token lookup

The public share API MUST resolve only exact non-null share tokens and MUST return only the critique display fields and signed media URLs.

#### Scenario: Valid token resolves display data
- **GIVEN** a saved critique has a non-null `share_token`
- **WHEN** an unauthenticated visitor requests `GET /api/share/[token]` with that token
- **THEN** the response includes `titulo`, `critica`, `imageUrl`, and optional `audioUrl`
- **AND** the response does not include owner identity or private gallery metadata

#### Scenario: Invalid or revoked token is not found
- **WHEN** an unauthenticated visitor requests `GET /api/share/[token]` with an unknown or revoked token
- **THEN** the system returns a not-found response without leaking critique data

### Requirement: The system SHALL render shared critiques on a noindex read-only page

The public share page MUST render a valid shared critique without requiring login, must be marked noindex/nofollow, and must omit owner-only mutation controls.

#### Scenario: Visitor opens a valid share page
- **GIVEN** a saved critique has a non-null `share_token`
- **WHEN** an unauthenticated visitor opens `/share/[token]`
- **THEN** the page shows the critique image, title, critique text, and available audio playback
- **AND** the page does not show reset, variation, delete, or revoke controls
- **AND** the page emits noindex/nofollow robots metadata

#### Scenario: Visitor opens an invalid share page
- **WHEN** an unauthenticated visitor opens `/share/[token]` for an unknown or revoked token
- **THEN** the page renders a not-found state

### Requirement: The system SHALL use the public share URL in share actions when available

Critique share handlers MUST use a provided `/share/[token]` URL for WhatsApp, X, and copy-link actions and fall back to the app origin only when no public share URL is available.

#### Scenario: Shared critique actions include the public URL
- **GIVEN** a critique result card receives a public share URL
- **WHEN** the user invokes WhatsApp, X, or copy-link sharing
- **THEN** the generated share content includes that public share URL

#### Scenario: Unshared critique actions keep the existing fallback
- **GIVEN** a critique result card does not receive a public share URL
- **WHEN** the user invokes WhatsApp, X, or copy-link sharing
- **THEN** the generated share content falls back to the app origin behavior
