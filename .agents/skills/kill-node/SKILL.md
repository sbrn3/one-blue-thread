---
name: kill-node
description: Identify and stop Node.js processes owned by the current user when the user explicitly asks to clean up Node, npm, Metro, Expo, or Vitest background processes.
---

# Kill Node processes

Process termination is destructive and must be explicitly requested.

1. List current-user Node processes with PID, command line, and executable path
   where available (`Get-CimInstance Win32_Process -Filter "Name='node.exe'"`).
   Do not expose unrelated environment values.
2. Distinguish processes tied to this repository (Metro/Expo on this project
   path, a `vitest` run, a dev-server background session you started) from
   unrelated Node apps. If the request says "all Node processes," state the exact
   count and scope before terminating; otherwise stop only the repo-related ones.
3. Use `Stop-Process -Id <pid> -Force` with resolved PIDs. Never terminate by an
   unresolved wildcard or touch another user's processes.
4. Recheck the list and report what stopped and what remains. If access is
   denied, request the minimum approval rather than broadening the command.
