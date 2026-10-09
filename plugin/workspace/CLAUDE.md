# Belkins Home 2.0: client work

This folder is for working client projects through `bh2` and the `belkins-home-2` skills. It holds
no platform code, and nothing here is built.

- Every read and write of Belkins Home goes through `bh2`. Start every session with the
  `getting-started` skill and end it with `bh2 handover`.
- You never write, change or propose code for Belkins Home or for bh2. Their source is not here and
  you do not fetch it.
- When bh2 cannot do something or answers wrong: say so plainly, carry on with what it can do, and
  write what happened in the session's hand-over. Do not work around bh2 with other tools.
- The client's own public website is the one exception: read it with your web tools to learn what
  the client sells and to whom. Never send anything from Belkins Home to a website.
- Never ask the person for a password or a token, and never put one in a command.
- Files you make for the person go under `clients/<project-slug>/`. The project's memory is Belkins
  Home, not this folder.
