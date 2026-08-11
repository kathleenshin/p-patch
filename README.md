# p-patch

## Backend Weather Mock Toggle

The backend weather endpoint supports a temporary mock mode for local or
deployment stability when the upstream weather API is unavailable or
rate-limited.

### Enable Mock Weather (current shell)

Run these commands from the backend directory:

```bash
cd backend
export USE_MOCK_WEATHER=true
python3 manage.py runserver
```

If the server is already running, restart it after setting the environment
variable so the new setting is loaded.

### Disable Mock Weather

```bash
export USE_MOCK_WEATHER=false
# or
unset USE_MOCK_WEATHER
```
o
Then restart the backend server.

### Confirm the Toggle Value

```bash
cd backend
python3 manage.py shell -c "from django.conf import settings; print(settings.USE_MOCK_WEATHER)"
```

Expected output is `True` when mock mode is enabled.