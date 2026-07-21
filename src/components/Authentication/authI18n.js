import { createLocaleGetter } from "../../i18n/translate";
const AUTH_COPY = {
  fr: {
    views: {
      login: {
        title: "Connexion",
        sub: "Accédez à votre espace de gestion."
      },
      forgot: {
        title: "Mot de passe oublié",
        sub: "Un lien de réinitialisation vous sera envoyé par email."
      }
    },
    panel: {
      agent: {
        headlineLine1: "Pilotez votre infrastructure,",
        headlineLine2: "en toute clarté.",
        sub: "Plateforme MSP centralisée pour la supervision, la gestion des clients et le suivi opérationnel.",
        features: ["Supervision des équipements", "Gestion clients & contrats", "Alertes & rapports en temps réel"]
      },
      client: {
        headlineLine1: "Votre espace entreprise,",
        headlineLine2: "à portée de main.",
        sub: "Accédez à vos équipements, documents et tickets depuis votre portail dédié.",
        features: ["Vue de vos équipements", "Vos tickets en cours", "Vos documents & rapports"]
      }
    },
    accountToggle: {
      agent: "Agent MSP",
      client: "Espace client"
    },
    back: "← Retour",
    mfa: {
      title: "Vérification MFA",
      sub: "Saisissez le code à 6 chiffres de votre application d'authentification.",
      codeLabel: "Code d'authentification",
      submit: "Valider"
    },
    fields: {
      email: "Email",
      password: "Mot de passe",
      rememberMe: "Se souvenir de moi",
      login: "Se connecter",
      forgotPassword: "Mot de passe oublié",
      sendLink: "Envoyer le lien",
      showPassword: "Afficher le mot de passe"
    },
    placeholders: {
      emailAgent: "prenom.nom@entreprise.com",
      emailClient: "contact@votreentreprise.com"
    },
    boot: {
      redirectSetup: "Redirection vers l'assistant d'installation…",
      checkingSetup: "Vérification de l'installation…",
      checkingService: "Vérification de la disponibilité du service…"
    },
    toasts: {
      forgotSuccess: "Si ce compte existe, un email a été envoyé.",
      forgotError: "Erreur lors de l'envoi du mail."
    },
    status: {
      title: "État système",
      api: "API",
      database: "Base de données",
      checkedAt: "Vérifié à {time}"
    },
    footer: "Veritas MSP · Conçu par Lucas Goulinet",
    reset: {
      invalidLink: "Lien invalide ou expiré.",
      passwordTooShort: "Mot de passe trop court (6 caractères min).",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      success: "Mot de passe réinitialisé !",
      error: "Erreur lors de la réinitialisation.",
      networkError: "Erreur réseau.",
      headline: "Nouveau mot de passe",
      headlineSub: "Choisissez un mot de passe sécurisé d'au moins 6 caractères.",
      title: "Réinitialisation",
      sub: "Saisissez et confirmez votre nouveau mot de passe.",
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Confirmer le mot de passe",
      submit: "Réinitialiser",
      saving: "Enregistrement..."
    },
    outage: {
      title: "Maintenance en cours",
      lead: "Veritas est temporairement indisponible. Notre équipe technique travaille activement à la résolution du problème.",
      sub: "Merci de votre patience. La connexion sera rétablie dès que possible.",
      apiUnavailable: "API indisponible",
      dbUnavailable: "Base de données indisponible",
      retry: "Réessayer",
      retrying: "Vérification…",
      lastCheck: "Dernière vérification à {time}"
    }
  },
  en: {
    views: {
      login: {
        title: "Sign in",
        sub: "Access your management workspace."
      },
      forgot: {
        title: "Forgot password",
        sub: "A reset link will be sent to your email address."
      }
    },
    panel: {
      agent: {
        headlineLine1: "Run your infrastructure,",
        headlineLine2: "with full clarity.",
        sub: "Centralized MSP platform for monitoring, client management, and operational tracking.",
        features: ["Equipment monitoring", "Client & contract management", "Real-time alerts & reports"]
      },
      client: {
        headlineLine1: "Your company portal,",
        headlineLine2: "at your fingertips.",
        sub: "Access your equipment, documents, and tickets from your dedicated portal.",
        features: ["View your equipment", "Your open tickets", "Your documents & reports"]
      }
    },
    accountToggle: {
      agent: "MSP Agent",
      client: "Client portal"
    },
    back: "← Back",
    mfa: {
      title: "MFA verification",
      sub: "Enter the 6-digit code from your authenticator app.",
      codeLabel: "Authentication code",
      submit: "Verify"
    },
    fields: {
      email: "Email",
      password: "Password",
      rememberMe: "Remember me",
      login: "Sign in",
      forgotPassword: "Forgot password",
      sendLink: "Send reset link",
      showPassword: "Show password"
    },
    placeholders: {
      emailAgent: "firstname.lastname@company.com",
      emailClient: "contact@yourcompany.com"
    },
    boot: {
      redirectSetup: "Redirecting to setup wizard…",
      checkingSetup: "Checking installation…",
      checkingService: "Checking service availability…"
    },
    toasts: {
      forgotSuccess: "If this account exists, an email has been sent.",
      forgotError: "Error sending the email."
    },
    status: {
      title: "System status",
      api: "API",
      database: "Database",
      checkedAt: "Checked at {time}"
    },
    footer: "Veritas MSP · Built by Lucas Goulinet",
    reset: {
      invalidLink: "Invalid or expired link.",
      passwordTooShort: "Password too short (6 characters minimum).",
      passwordMismatch: "Passwords do not match.",
      success: "Password reset successfully!",
      error: "Error resetting password.",
      networkError: "Network error.",
      headline: "New password",
      headlineSub: "Choose a secure password with at least 6 characters.",
      title: "Password reset",
      sub: "Enter and confirm your new password.",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      submit: "Reset password",
      saving: "Saving..."
    },
    outage: {
      title: "Maintenance in progress",
      lead: "Veritas is temporarily unavailable. Our technical team is actively working to resolve the issue.",
      sub: "Thank you for your patience. Access will be restored as soon as possible.",
      apiUnavailable: "API unavailable",
      dbUnavailable: "Database unavailable",
      retry: "Retry",
      retrying: "Checking…",
      lastCheck: "Last check at {time}"
    }
  },
  de: {
    views: {
      login: {
        title: "Anmeldung",
        sub: "Greifen Sie auf Ihren Verwaltungsbereich zu."
      },
      forgot: {
        title: "Passwort vergessen",
        sub: "Ein Link zur Zurücksetzung wird per E-Mail gesendet."
      }
    },
    panel: {
      agent: {
        headlineLine1: "Steuern Sie Ihre Infrastruktur",
        headlineLine2: "mit voller Übersicht.",
        sub: "Zentrale MSP-Plattform für Überwachung, Kundenverwaltung und operatives Tracking.",
        features: ["Geräteüberwachung", "Kunden- & Vertragsverwaltung", "Echtzeit-Alerts & Berichte"]
      },
      client: {
        headlineLine1: "Ihr Unternehmensportal,",
        headlineLine2: "immer griffbereit.",
        sub: "Greifen Sie auf Geräte, Dokumente und Tickets in Ihrem Portal zu.",
        features: ["Ihre Geräte", "Ihre offenen Tickets", "Ihre Dokumente & Berichte"]
      }
    },
    accountToggle: {
      agent: "MSP-Agent",
      client: "Kundenportal"
    },
    back: "← Zurück",
    mfa: {
      title: "MFA-Verifizierung",
      sub: "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.",
      codeLabel: "Authentifizierungscode",
      submit: "Bestätigen"
    },
    fields: {
      email: "E-Mail",
      password: "Passwort",
      rememberMe: "Angemeldet bleiben",
      login: "Anmelden",
      forgotPassword: "Passwort vergessen",
      sendLink: "Link senden",
      showPassword: "Passwort anzeigen"
    },
    placeholders: {
      emailAgent: "vorname.nachname@unternehmen.de",
      emailClient: "kontakt@ihreunternehmen.de"
    },
    boot: {
      redirectSetup: "Weiterleitung zum Setup-Assistenten…",
      checkingSetup: "Installation wird geprüft…",
      checkingService: "Verfügbarkeit des Dienstes wird geprüft…"
    },
    toasts: {
      forgotSuccess: "Falls dieses Konto existiert, wurde eine E-Mail gesendet.",
      forgotError: "Fehler beim Senden der E-Mail."
    },
    status: {
      title: "Systemstatus",
      api: "API",
      database: "Datenbank",
      checkedAt: "Geprüft um {time}"
    },
    footer: "Veritas MSP · Entwickelt von Lucas Goulinet",
    reset: {
      invalidLink: "Ungültiger oder abgelaufener Link.",
      passwordTooShort: "Passwort zu kurz (mindestens 6 Zeichen).",
      passwordMismatch: "Passwörter stimmen nicht überein.",
      success: "Passwort erfolgreich zurückgesetzt!",
      error: "Fehler beim Zurücksetzen des Passworts.",
      networkError: "Netzwerkfehler.",
      headline: "Neues Passwort",
      headlineSub: "Wählen Sie ein sicheres Passwort mit mindestens 6 Zeichen.",
      title: "Passwort zurücksetzen",
      sub: "Geben Sie Ihr neues Passwort ein und bestätigen Sie es.",
      newPassword: "Neues Passwort",
      confirmPassword: "Passwort bestätigen",
      submit: "Zurücksetzen",
      saving: "Speichern..."
    },
    outage: {
      title: "Wartung läuft",
      lead: "Veritas ist vorübergehend nicht verfügbar. Unser technisches Team arbeitet aktiv an der Behebung.",
      sub: "Vielen Dank für Ihre Geduld. Der Zugang wird so schnell wie möglich wiederhergestellt.",
      apiUnavailable: "API nicht verfügbar",
      dbUnavailable: "Datenbank nicht verfügbar",
      retry: "Erneut versuchen",
      retrying: "Prüfung…",
      lastCheck: "Letzte Prüfung um {time}"
    }
  },
  it: {
    views: {
      login: {
        title: "Accesso",
        sub: "Accedi al tuo spazio di gestione."
      },
      forgot: {
        title: "Password dimenticata",
        sub: "Ti verrà inviato un link di reimpostazione via email."
      }
    },
    panel: {
      agent: {
        headlineLine1: "Gestisci la tua infrastruttura",
        headlineLine2: "con piena chiarezza.",
        sub: "Piattaforma MSP centralizzata per monitoraggio, gestione clienti e operatività.",
        features: ["Monitoraggio equipaggiamenti", "Gestione clienti e contratti", "Avvisi e report in tempo reale"]
      },
      client: {
        headlineLine1: "Il tuo portale aziendale,",
        headlineLine2: "a portata di mano.",
        sub: "Accedi a equipaggiamenti, documenti e ticket dal tuo portale dedicato.",
        features: ["I tuoi equipaggiamenti", "I tuoi ticket aperti", "I tuoi documenti e report"]
      }
    },
    accountToggle: {
      agent: "Agente MSP",
      client: "Portale clienti"
    },
    back: "← Indietro",
    mfa: {
      title: "Verifica MFA",
      sub: "Inserisci il codice a 6 cifre dalla tua app di autenticazione.",
      codeLabel: "Codice di autenticazione",
      submit: "Conferma"
    },
    fields: {
      email: "Email",
      password: "Password",
      rememberMe: "Ricordami",
      login: "Accedi",
      forgotPassword: "Password dimenticata",
      sendLink: "Invia link",
      showPassword: "Mostra password"
    },
    placeholders: {
      emailAgent: "nome.cognome@azienda.it",
      emailClient: "contatto@la-tua-azienda.it"
    },
    boot: {
      redirectSetup: "Reindirizzamento alla procedura guidata…",
      checkingSetup: "Verifica dell'installazione…",
      checkingService: "Verifica della disponibilità del servizio…"
    },
    toasts: {
      forgotSuccess: "Se l'account esiste, è stata inviata un'email.",
      forgotError: "Errore durante l'invio dell'email."
    },
    status: {
      title: "Stato del sistema",
      api: "API",
      database: "Database",
      checkedAt: "Verificato alle {time}"
    },
    footer: "Veritas MSP · Creato da Lucas Goulinet",
    reset: {
      invalidLink: "Link non valido o scaduto.",
      passwordTooShort: "Password troppo corta (minimo 6 caratteri).",
      passwordMismatch: "Le password non corrispondono.",
      success: "Password reimpostata!",
      error: "Errore durante la reimpostazione.",
      networkError: "Errore di rete.",
      headline: "Nuova password",
      headlineSub: "Scegli una password sicura di almeno 6 caratteri.",
      title: "Reimpostazione",
      sub: "Inserisci e conferma la nuova password.",
      newPassword: "Nuova password",
      confirmPassword: "Conferma password",
      submit: "Reimpostare",
      saving: "Salvataggio..."
    },
    outage: {
      title: "Manutenzione in corso",
      lead: "Veritas è temporaneamente non disponibile. Il nostro team tecnico sta lavorando per risolvere il problema.",
      sub: "Grazie per la pazienza. L'accesso sarà ripristinato il prima possibile.",
      apiUnavailable: "API non disponibile",
      dbUnavailable: "Database non disponibile",
      retry: "Riprova",
      retrying: "Verifica…",
      lastCheck: "Ultima verifica alle {time}"
    }
  },
  es: {
    views: {
      login: {
        title: "Iniciar sesión",
        sub: "Acceda a su espacio de gestión."
      },
      forgot: {
        title: "Contraseña olvidada",
        sub: "Se enviará un enlace de restablecimiento a su correo electrónico."
      }
    },
    panel: {
      agent: {
        headlineLine1: "Gestione su infraestructura",
        headlineLine2: "con total claridad.",
        sub: "Plataforma MSP centralizada para supervisión, gestión de clientes y seguimiento operativo.",
        features: ["Supervisión de equipos", "Gestión de clientes y contratos", "Alertas e informes en tiempo real"]
      },
      client: {
        headlineLine1: "Su portal empresarial,",
        headlineLine2: "al alcance de la mano.",
        sub: "Acceda a equipos, documentos y tickets desde su portal dedicado.",
        features: ["Sus equipos", "Sus tickets abiertos", "Sus documentos e informes"]
      }
    },
    accountToggle: {
      agent: "Agente MSP",
      client: "Portal cliente"
    },
    back: "← Volver",
    mfa: {
      title: "Verificación MFA",
      sub: "Introduzca el código de 6 dígitos de su aplicación de autenticación.",
      codeLabel: "Código de autenticación",
      submit: "Validar"
    },
    fields: {
      email: "Correo electrónico",
      password: "Contraseña",
      rememberMe: "Recordarme",
      login: "Iniciar sesión",
      forgotPassword: "Contraseña olvidada",
      sendLink: "Enviar enlace",
      showPassword: "Mostrar contraseña"
    },
    placeholders: {
      emailAgent: "nombre.apellido@empresa.com",
      emailClient: "contacto@suempresa.com"
    },
    boot: {
      redirectSetup: "Redirigiendo al asistente de instalación…",
      checkingSetup: "Comprobando la instalación…",
      checkingService: "Comprobando la disponibilidad del servicio…"
    },
    toasts: {
      forgotSuccess: "Si la cuenta existe, se ha enviado un correo.",
      forgotError: "Error al enviar el correo."
    },
    status: {
      title: "Estado del sistema",
      api: "API",
      database: "Base de datos",
      checkedAt: "Comprobado a las {time}"
    },
    footer: "Veritas MSP · Creado por Lucas Goulinet",
    reset: {
      invalidLink: "Enlace no válido o caducado.",
      passwordTooShort: "Contraseña demasiado corta (mínimo 6 caracteres).",
      passwordMismatch: "Las contraseñas no coinciden.",
      success: "¡Contraseña restablecida!",
      error: "Error al restablecer la contraseña.",
      networkError: "Error de red.",
      headline: "Nueva contraseña",
      headlineSub: "Elija una contraseña segura de al menos 6 caracteres.",
      title: "Restablecimiento",
      sub: "Introduzca y confirme su nueva contraseña.",
      newPassword: "Nueva contraseña",
      confirmPassword: "Confirmar contraseña",
      submit: "Restablecer",
      saving: "Guardando..."
    },
    outage: {
      title: "Mantenimiento en curso",
      lead: "Veritas no está disponible temporalmente. Nuestro equipo técnico está trabajando activamente para resolver el problema.",
      sub: "Gracias por su paciencia. El acceso se restablecerá lo antes posible.",
      apiUnavailable: "API no disponible",
      dbUnavailable: "Base de datos no disponible",
      retry: "Reintentar",
      retrying: "Comprobando…",
      lastCheck: "Última comprobación a las {time}"
    }
  }
};
export const getAuthCopy = createLocaleGetter(AUTH_COPY);
