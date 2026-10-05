// cx-commons' own strings, in every locale it ships (daml-escrow PLAN.md
// Phase 71). Registered as library defaults on import, so an app's catalogs
// override any of them by key. Vocabulary follows daml-escrow
// docs/i18n/GLOSSARY.md (e.g. "Ledger ID", D1). French is a machine draft
// pending review (D12).

import { registerMessages, type Catalogs } from './i18n';

export const cxMessages = {
    en: {
        cx: {
            copy: 'Copy',
            copied: 'Copied',
            copyFailed: 'Copy failed',
            dismiss: 'Dismiss',
            details: 'Details',
            copyErrorJson: 'Copy error JSON',
            request: 'Request',
            trace: 'Trace',
            node: 'Node',
            upstreamSays: '{service} says',
            originalMessage: 'Original message',
            copyId: '{kind, select, party {Copy ledger ID} fingerprint {Copy key fingerprint} hash {Copy hash} other {Copy value}}',
            numbered: '{label} {n}',
            detail: {
                party: 'Ledger ID',
                partyFingerprint: 'Ledger ID key fingerprint',
                publicKeyFingerprint: 'Your key fingerprint',
                signatureReceived: 'Signature received',
                signedBy: 'Signed by key',
                signedMessage: 'What was signed',
                expectedHash: 'Expected transaction hash',
                computedHash: 'Computed transaction hash',
                ledgerUser: 'Ledger user',
                actAs: 'Acting as',
            },
            footer: {
                copyright: '© {year} Data Cloud, LLC. All rights reserved.',
                terms: 'Terms and conditions',
                privacy: 'Privacy policy',
                cookies: 'Cookie preferences',
            },
            nav: {
                home: 'Home',
                products: 'Products',
                blog: 'Blog',
                about: 'About',
                toggleDarkMode: 'Toggle dark mode',
            },
            status: {
                DRAFT: 'Draft',
                FUNDED: 'Funds committed',
                ACTIVE: 'Active',
                PROPOSED: 'Settlement offered',
                DISPUTED: 'Disputed',
                ARBITRATION: 'Arbitration',
                SETTLED: 'Settled',
                AWAITING_CUSTODY_APPROVAL: 'Awaiting custody approval',
                FIAT_PENDING: 'Fiat payment pending',
                LAPSED: 'Lapsed',
            },
            dialog: {
                confirm: 'Confirm',
                cancel: 'Cancel',
                ok: 'OK',
                close: 'Close',
            },
            language: {
                label: 'Language',
                choose: 'Choose language',
                en: 'English',
                fr: 'Français',
            },
        },
    },
    fr: {
        cx: {
            copy: 'Copier',
            copied: 'Copié',
            copyFailed: 'Échec de la copie',
            dismiss: 'Fermer',
            details: 'Détails',
            copyErrorJson: 'Copier le JSON de l’erreur',
            request: 'Requête',
            trace: 'Trace',
            node: 'Nœud',
            upstreamSays: 'Réponse de {service}',
            originalMessage: 'Message d’origine',
            copyId: '{kind, select, party {Copier l’identifiant sur le registre} fingerprint {Copier l’empreinte de la clé} hash {Copier l’empreinte} other {Copier la valeur}}',
            numbered: '{label} {n}',
            detail: {
                party: 'Identifiant sur le registre',
                partyFingerprint: 'Empreinte de la clé de l’identifiant',
                publicKeyFingerprint: 'Empreinte de votre clé',
                signatureReceived: 'Signature reçue',
                signedBy: 'Signé par la clé',
                signedMessage: 'Contenu signé',
                expectedHash: 'Empreinte de transaction attendue',
                computedHash: 'Empreinte de transaction calculée',
                ledgerUser: 'Utilisateur du registre',
                actAs: 'Agit en tant que',
            },
            footer: {
                copyright: '© {year} Data Cloud, LLC. Tous droits réservés.',
                terms: 'Conditions générales',
                privacy: 'Politique de confidentialité',
                cookies: 'Préférences en matière de cookies',
            },
            nav: {
                home: 'Accueil',
                products: 'Produits',
                blog: 'Blog',
                about: 'À propos',
                toggleDarkMode: 'Basculer le mode sombre',
            },
            status: {
                DRAFT: 'Projet',
                FUNDED: 'Fonds engagés',
                ACTIVE: 'Actif',
                PROPOSED: 'Règlement proposé',
                DISPUTED: 'En litige',
                ARBITRATION: 'Arbitrage',
                SETTLED: 'Réglé',
                AWAITING_CUSTODY_APPROVAL: 'En attente d’approbation de la conservation',
                FIAT_PENDING: 'Paiement fiat en attente',
                LAPSED: 'Expiré',
            },
            dialog: {
                confirm: 'Confirmer',
                cancel: 'Annuler',
                ok: 'OK',
                close: 'Fermer',
            },
            language: {
                label: 'Langue',
                choose: 'Choisir la langue',
                en: 'English',
                fr: 'Français',
            },
        },
    },
} satisfies Catalogs;

/** The locales cx-commons ships strings for. */
export const CX_LOCALES = Object.keys(cxMessages);

registerMessages(cxMessages, { layer: 'defaults' });
