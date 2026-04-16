;; Mock sBTC Token -- for devnet/testnet use only
;; Simulates the SIP-010 sBTC token so you can test PayBridge
;; without bridging real BTC. On mainnet, use the real sBTC contract.

(impl-trait .sip-010-trait.sip-010-trait)

(define-fungible-token mock-sbtc)

(define-data-var contract-owner principal tx-sender)

;; --- SIP-010 Required Functions ---

;; #[allow(unchecked-data)]
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) (err u401))
    (asserts! (> amount u0) (err u400))
    (try! (ft-transfer? mock-sbtc amount sender recipient))
    (match memo some-memo (print some-memo) 0x)
    (ok true)
  )
)

(define-read-only (get-name)
  (ok "Mock sBTC")
)

(define-read-only (get-symbol)
  (ok "msBTC")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance mock-sbtc account))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply mock-sbtc))
)

(define-read-only (get-token-uri)
  (ok (some u"https://paybridge.dev/mock-sbtc"))
)

;; --- Test Helpers (devnet only) ---

;; #[allow(unchecked-data)]
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u403))
    (ft-mint? mock-sbtc amount recipient)
  )
)
