# TCC Floating Order Monitor (Windows 10)

A small always-on-top Windows desktop panel for new TCC web orders. It uses the existing TCC Orders Edge Function and the same admin username/password as Order Desk.

## Behaviour
- Polls new orders every 4 seconds.
- Shows order number, dine-in table/takeaway, customer, phone, items, amount and waiting time.
- Accept & Prepare and Reject call the existing authenticated `update-status` action.
- Keeps above SR POS (TopMost); movable/resizable.
- Stores the 12-hour admin session using Windows DPAPI for the current Windows user.
- Can start automatically at Windows sign-in (enabled by installer/startup registration).
- No database schema changes and no service-role key in the desktop app.

## Build
Open `TccOrderMonitor.sln` or run:
```powershell
dotnet publish .\TccOrderMonitor.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```
The published executable is in `bin\Release\net8.0-windows\win-x64\publish\`.

## First launch
Sign in with the same Order Desk admin credentials. Session token is protected with DPAPI and is valid for the server's 12-hour session. If it expires, the app asks you to sign in again.

## Notes
- Requires Windows 10 1809 or later (64-bit) for this .NET 8 build.
- Keep the computer connected to the internet and do not disable the app in Windows startup settings.
