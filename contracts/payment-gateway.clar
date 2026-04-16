;; PayBridge Payment Gateway
;; Bitcoin L2 payment infrastructure built on Stacks
;; Hackathon: Stacks Builder Rewards -- April 2026

(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; --- Error Codes ---

(define-constant ERR-NOT-AUTHORIZED       (err u100))
(define-constant ERR-MERCHANT-NOT-FOUND   (err u101))
(define-constant ERR-MERCHANT-EXISTS      (err u102))
(define-constant ERR-PAYMENT-NOT-FOUND    (err u103))
(define-constant ERR-PAYMENT-EXISTS       (err u104))
(define-constant ERR-PAYMENT-EXPIRED      (err u105))
(define-constant ERR-PAYMENT-NOT-PENDING  (err u106))
(define-constant ERR-WRONG-AMOUNT         (err u107))
(define-constant ERR-INVALID-AMOUNT       (err u108))
(define-constant ERR-INVALID-EXPIRY       (err u109))
(define-constant ERR-SELF-PAYMENT         (err u110))
(define-constant ERR-ALREADY-RELEASED     (err u111))
(define-constant ERR-NOT-EXPIRED          (err u112))

;; --- Constants ---

(define-constant CONTRACT-OWNER tx-sender)

;; Protocol fee: 0.5% (50 basis points out of 10000)
(define-constant FEE-BASIS-POINTS u50)
(define-constant FEE-DENOMINATOR  u10000)

;; Default payment window: ~144 Bitcoin blocks = ~24 hours
(define-constant DEFAULT-EXPIRY-BLOCKS u144)

;; Payment statuses stored as uint
;; 0=pending 1=confirmed 2=released 3=refunded 4=expired
(define-constant STATUS-PENDING   u0)
(define-constant STATUS-CONFIRMED u1)
(define-constant STATUS-RELEASED  u2)
(define-constant STATUS-REFUNDED  u3)
(define-constant STATUS-EXPIRED   u4)

;; --- Data Storage ---

;; Merchant registry: merchant-id -> merchant details
(define-map merchants
  { merchant-id: (string-ascii 36) }
  {
    owner:          principal,
    name:           (string-utf8 64),
    webhook-url:    (string-utf8 256),
    total-received: uint,
    total-fees:     uint,
    active:         bool,
    created-at:     uint
  }
)

;; Payment intents: payment-id -> payment details
(define-map payments
  { payment-id: (string-ascii 36) }
  {
    merchant-id:  (string-ascii 36),
    payer:        (optional principal),
    amount:       uint,
    fee:          uint,
    status:       uint,
    expires-at:   uint,
    created-at:   uint,
    confirmed-at: (optional uint),
    released-at:  (optional uint),
    memo:         (optional (string-utf8 256))
  }
)

;; Merchant balances: funds confirmed but not yet released
(define-map merchant-balances
  { merchant-id: (string-ascii 36) }
  { balance: uint }
)

;; Total protocol fees collected
(define-data-var protocol-fees-collected uint u0)

;; --- Merchant Functions ---

;; #[allow(unchecked-data)]
(define-public (register-merchant
    (merchant-id  (string-ascii 36))
    (name         (string-utf8 64))
    (webhook-url  (string-utf8 256)))
  (begin
    (asserts! (> (len merchant-id) u0) ERR-INVALID-AMOUNT)
    (asserts! (> (len name) u0) ERR-INVALID-AMOUNT)
    (asserts! (is-none (map-get? merchants { merchant-id: merchant-id })) ERR-MERCHANT-EXISTS)
    (map-set merchants
      { merchant-id: merchant-id }
      {
        owner:          tx-sender,
        name:           name,
        webhook-url:    webhook-url,
        total-received: u0,
        total-fees:     u0,
        active:         true,
        created-at:     block-height
      })
    (map-set merchant-balances
      { merchant-id: merchant-id }
      { balance: u0 })
    (print { event: "merchant-registered", merchant-id: merchant-id, owner: tx-sender })
    (ok merchant-id)
  )
)

(define-read-only (get-merchant (merchant-id (string-ascii 36)))
  (map-get? merchants { merchant-id: merchant-id })
)

(define-read-only (get-merchant-balance (merchant-id (string-ascii 36)))
  (default-to
    { balance: u0 }
    (map-get? merchant-balances { merchant-id: merchant-id }))
)

;; --- Payment Functions ---

;; #[allow(unchecked-data)]
(define-public (create-payment
    (payment-id  (string-ascii 36))
    (merchant-id (string-ascii 36))
    (amount      uint)
    (memo        (optional (string-utf8 256))))
  (let (
    (merchant (unwrap! (map-get? merchants { merchant-id: merchant-id }) ERR-MERCHANT-NOT-FOUND))
    (fee      (/ (* amount FEE-BASIS-POINTS) FEE-DENOMINATOR))
    (expires  (+ block-height DEFAULT-EXPIRY-BLOCKS))
  )
    (asserts! (is-eq tx-sender (get owner merchant)) ERR-NOT-AUTHORIZED)
    (asserts! (get active merchant) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (> (len payment-id) u0) ERR-INVALID-AMOUNT)
    (asserts! (is-none (map-get? payments { payment-id: payment-id })) ERR-PAYMENT-EXISTS)
    (map-set payments
      { payment-id: payment-id }
      {
        merchant-id:  merchant-id,
        payer:        none,
        amount:       amount,
        fee:          fee,
        status:       STATUS-PENDING,
        expires-at:   expires,
        created-at:   block-height,
        confirmed-at: none,
        released-at:  none,
        memo:         memo
      })
    (print {
      event:       "payment-created",
      payment-id:  payment-id,
      merchant-id: merchant-id,
      amount:      amount,
      fee:         fee,
      expires-at:  expires
    })
    (ok { payment-id: payment-id, amount: amount, fee: fee, expires-at: expires })
  )
)

;; #[allow(unchecked-data)]
(define-public (pay
    (payment-id  (string-ascii 36))
    (sbtc-token  <sip-010-trait>))
  (let (
    (payment  (unwrap! (map-get? payments { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
    (merchant (unwrap! (map-get? merchants { merchant-id: (get merchant-id payment) }) ERR-MERCHANT-NOT-FOUND))
    (amount   (get amount payment))
    (fee      (get fee payment))
    (net      (- amount fee))
    (cur-bal  (get balance (get-merchant-balance (get merchant-id payment))))
  )
    (asserts! (> (len payment-id) u0) ERR-INVALID-AMOUNT)
    ;; Self-payment check BEFORE status check so ERR-SELF-PAYMENT (u110)
    ;; is returned even when payment is still pending
    (asserts! (not (is-eq tx-sender (get owner merchant))) ERR-SELF-PAYMENT)
    (asserts! (is-eq (get status payment) STATUS-PENDING) ERR-PAYMENT-NOT-PENDING)
    (asserts! (<= block-height (get expires-at payment)) ERR-PAYMENT-EXPIRED)
    (try! (contract-call? sbtc-token transfer amount tx-sender (as-contract tx-sender) none))
    (map-set payments
      { payment-id: payment-id }
      (merge payment {
        payer:        (some tx-sender),
        status:       STATUS-CONFIRMED,
        confirmed-at: (some block-height)
      }))
    (map-set merchant-balances
      { merchant-id: (get merchant-id payment) }
      { balance: (+ cur-bal net) })
    (var-set protocol-fees-collected (+ (var-get protocol-fees-collected) fee))
    (map-set merchants
      { merchant-id: (get merchant-id payment) }
      (merge merchant {
        total-received: (+ (get total-received merchant) net),
        total-fees:     (+ (get total-fees merchant) fee)
      }))
    (print {
      event:       "payment-confirmed",
      payment-id:  payment-id,
      merchant-id: (get merchant-id payment),
      payer:       tx-sender,
      amount:      amount,
      fee:         fee,
      net:         net
    })
    (ok { payment-id: payment-id, amount: amount, net: net, fee: fee })
  )
)

;; #[allow(unchecked-data)]
(define-public (release-payment
    (payment-id  (string-ascii 36))
    (sbtc-token  <sip-010-trait>))
  (let (
    (payment  (unwrap! (map-get? payments { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
    (merchant (unwrap! (map-get? merchants { merchant-id: (get merchant-id payment) }) ERR-MERCHANT-NOT-FOUND))
    (net      (- (get amount payment) (get fee payment)))
    (cur-bal  (get balance (get-merchant-balance (get merchant-id payment))))
  )
    (asserts! (> (len payment-id) u0) ERR-INVALID-AMOUNT)
    (asserts! (is-eq tx-sender (get owner merchant)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status payment) STATUS-CONFIRMED) ERR-ALREADY-RELEASED)
    (try! (as-contract (contract-call? sbtc-token transfer net tx-sender (get owner merchant) none)))
    (map-set merchant-balances
      { merchant-id: (get merchant-id payment) }
      { balance: (- cur-bal net) })
    (map-set payments
      { payment-id: payment-id }
      (merge payment {
        status:      STATUS-RELEASED,
        released-at: (some block-height)
      }))
    (print {
      event:       "payment-released",
      payment-id:  payment-id,
      merchant-id: (get merchant-id payment),
      recipient:   (get owner merchant),
      amount:      net
    })
    (ok { payment-id: payment-id, released-to: (get owner merchant), amount: net })
  )
)

;; #[allow(unchecked-data)]
(define-public (refund-expired
    (payment-id  (string-ascii 36))
    (sbtc-token  <sip-010-trait>))
  (let (
    (payment (unwrap! (map-get? payments { payment-id: payment-id }) ERR-PAYMENT-NOT-FOUND))
    (payer   (unwrap! (get payer payment) ERR-PAYMENT-NOT-PENDING))
    (amount  (get amount payment))
  )
    (asserts! (> (len payment-id) u0) ERR-INVALID-AMOUNT)
    (asserts! (is-eq (get status payment) STATUS-CONFIRMED) ERR-PAYMENT-NOT-PENDING)
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (try! (as-contract (contract-call? sbtc-token transfer amount tx-sender payer none)))
    (map-set payments
      { payment-id: payment-id }
      (merge payment { status: STATUS-REFUNDED }))
    (print { event: "payment-refunded", payment-id: payment-id, payer: payer, amount: amount })
    (ok { payment-id: payment-id, refunded-to: payer, amount: amount })
  )
)

;; --- Read-Only Helpers ---

(define-read-only (get-payment (payment-id (string-ascii 36)))
  (map-get? payments { payment-id: payment-id })
)

(define-read-only (get-payment-status (payment-id (string-ascii 36)))
  (match (map-get? payments { payment-id: payment-id })
    payment (ok (get status payment))
    ERR-PAYMENT-NOT-FOUND
  )
)

(define-read-only (is-payment-expired (payment-id (string-ascii 36)))
  (match (map-get? payments { payment-id: payment-id })
    payment (ok (> block-height (get expires-at payment)))
    ERR-PAYMENT-NOT-FOUND
  )
)

(define-read-only (calculate-fee (amount uint))
  (ok (/ (* amount FEE-BASIS-POINTS) FEE-DENOMINATOR))
)

(define-read-only (get-protocol-fees)
  (var-get protocol-fees-collected)
)

;; --- Admin ---

;; #[allow(unchecked-data)]
(define-public (claim-protocol-fees (sbtc-token <sip-010-trait>))
  (let ((fees (var-get protocol-fees-collected)))
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> fees u0) ERR-INVALID-AMOUNT)
    (try! (as-contract (contract-call? sbtc-token transfer fees tx-sender CONTRACT-OWNER none)))
    (var-set protocol-fees-collected u0)
    (ok fees)
  )
)
