from django.conf import settings
from django.http import HttpResponse
from urllib.parse import urlparse


def _is_allowed_dev_origin(origin):
    if not origin:
        return False

    allowed_origins = set(getattr(settings, "CORS_ALLOWED_ORIGINS", []))
    if origin in allowed_origins:
        return True

    if not getattr(settings, "DEBUG", False):
        return False

    parsed = urlparse(origin)
    return parsed.scheme in {"http", "https"} and parsed.hostname in {
        "localhost",
        "127.0.0.1",
        "[::1]",
    }


class ExpoCorsFallbackMiddleware:
    """Guarantee CORS headers for local Expo web requests during development."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        is_allowed_origin = _is_allowed_dev_origin(origin)

        if request.method == "OPTIONS" and is_allowed_origin:
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if is_allowed_origin:
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Methods"] = "DELETE, GET, OPTIONS, PATCH, POST, PUT"
            response["Access-Control-Allow-Headers"] = (
                "accept, accept-encoding, authorization, content-type, dnt, "
                "origin, user-agent, x-csrftoken, x-requested-with"
            )

        return response
