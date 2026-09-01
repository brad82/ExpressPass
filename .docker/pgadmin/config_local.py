AUTHENTICATION_SOURCES = ["oauth2"]
OAUTH2_AUTO_CREATE_USER = True
MASTER_PASSWORD_REQUIRED = False

OAUTH2_CONFIG = [
    {
        "OAUTH2_NAME": "authentik",
        "OAUTH2_DISPLAY_NAME": "Authentik",
        "OAUTH2_CLIENT_ID": "pgadmin",
        "OAUTH2_CLIENT_SECRET": None,
        "OAUTH2_SERVER_METADATA_URL": "http://auth.localhost/application/o/pgadmin/.well-known/openid-configuration",
        "OAUTH2_SCOPE": "openid email profile",
        "OAUTH2_CHALLENGE_METHOD": "S256",
        "OAUTH2_RESPONSE_TYPE": "code",
        "OAUTH2_BUTTON_COLOR": "#fd4b2d",
        "OAUTH2_ICON": "fa-shield-alt",
    }
]
