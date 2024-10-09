class DummyMiddleware:
    """
    Dummy middleware that passes requests and responses along
    without modification. This can help avoid issues where
    certain middlewares don't handle coroutine responses correctly.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response