"""
Django settings for chatapp project.

Generated by 'django-admin startproject' using Django 3.1.

For more information on this file, see
https://docs.djangoproject.com/en/3.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.1/ref/settings/
"""

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve(strict=True).parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'pdg@qfl(s10^)me7qf_#t@26pa^49&hjmx^f774rm2w9a792yy'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']


# Application definition

INSTALLED_APPS = [
    'daphne',
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',
    'chat',
    'rest_framework',
    'rest_framework_simplejwt',
]

MIDDLEWARE = [
     'corsheaders.middleware.CorsMiddleware',  # Ensure this is first if using django-cors-headers
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',  # Handles session management
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',  # Handles authentication (populates request.user)
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# This allows credentials such as cookies to be included
CORS_ALLOW_CREDENTIALS = True

# Allow Angular frontend URL
CORS_ALLOWED_ORIGINS = [
    'http://localhost:4200',
    'http://127.0.0.1:4200'
]

CORS_ALLOW_METHODS = [
    'GET',  # For reading resources (like authentication check)
    'POST',  # For creating resources
    'PUT',  # For updating resources
    'PATCH',  # For partial updates
    'DELETE',  # For deleting resources
    'OPTIONS',  # Pre-flight request method (automatically sent by the browser)
]

CORS_ALLOW_HEADERS = [
    'Authorization',  # Allow Authorization header for token-based auth (if used)
    'content-type',   # Allow Content-Type for POST/PUT requests
    'x-csrftoken',    # Allow CSRF token header for CSRF protection
    'accept',         # Accept header for specifying response types
    'origin',         # Origin header for cross-origin requests
    'user-agent',     # User-Agent for client identification
    'x-requested-with',  # Allows XMLHttpRequest (used by many JavaScript frameworks)
    'cookie',         # Allow cookies (session management)
]

CSRF_TRUSTED_ORIGINS = ['http://localhost:4200']  # Trust Angular's origin

# Configure DRF to use JWT Authentication
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# Import SimpleJWT settings
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

ROOT_URLCONF = 'chatapp.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI_APPLICATION = 'chatapp.wsgi.application'
ASGI_APPLICATION = 'chatapp.asgi.application'


# Database
# https://docs.djangoproject.com/en/3.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/3.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.1/howto/static-files/

STATIC_URL = '/static/'

CHANNEL_LAYERS = {
  'default': {
    'BACKEND': 'channels.layers.InMemoryChannelLayer',
    # 'CONFIG': {
    #   'hosts':[('127.0.0.1', 4200)],
    # }
  }
}
  
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
