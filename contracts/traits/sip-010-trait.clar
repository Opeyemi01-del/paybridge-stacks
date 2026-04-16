;; SIP-010 Fungible Token Standard Trait
;; This is the official interface that sBTC implements.
;; PayBridge uses this to interact with sBTC transfers on Stacks.

(define-trait sip-010-trait
  (
    ;; Transfer tokens from sender to recipient
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))

    ;; Get the human-readable token name
    (get-name () (response (string-ascii 32) uint))

    ;; Get the token ticker symbol
    (get-symbol () (response (string-ascii 32) uint))

    ;; Get the number of decimals (sBTC uses 8, same as Bitcoin)
    (get-decimals () (response uint uint))

    ;; Get the STX balance of a principal
    (get-balance (principal) (response uint uint))

    ;; Get total supply of the token
    (get-total-supply () (response uint uint))

    ;; Get a URI pointing to token metadata
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)
