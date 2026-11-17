# vintage-documentary — a free Claude skill

Turn **a script + a voiceover + a folder of real images** into a finished vintage "evidence board" documentary: dark green board, cream-bordered archive photos, typewriter labels that type in on the spoken name, red marker ink, rubber stamps, a camera that never stops, glitch titles, and optional sepia 2D animation scenes. Claude does the editing; the video is rendered locally with [HyperFrames](https://github.com/heygen-com/hyperframes) (open source).

## What you need
- **Claude Code** (the Code tab in the Claude desktop app, or the `claude` CLI). It must be able to run commands on your computer.
- **Node.js 18+** and **ffmpeg** on your PATH. HyperFrames downloads its own Chrome.
- Optional: an NVIDIA/AMD GPU for faster renders.

## Install
1. Download `vintage-documentary.zip`.
2. Ask Claude: *"Install the skill in vintage-documentary.zip so you can use it."*
   (Or unzip it yourself into `~/.claude/skills/` so you get `~/.claude/skills/vintage-documentary/SKILL.md`.)

## Use
Put these in one folder:
```
script.md          the narration text
narration.mp3      your voiceover (any voice tool)
images/            real photos you're allowed to use, renamed to match the script
                   e.g. kasparov_1985_world_champion.jpg, not IMG_4821.jpg
```
Then ask Claude: *"Use the vintage documentary skill to make a documentary from script.md, narration.mp3 and the images folder."*

Claude transcribes the voiceover locally (word timings), looks at every image, plans the board, cues every label and stamp to the spoken word, checks still frames, and renders `documentary.mp4`.

Ask for changes in plain words: *"Add a vintage 2D animation scene when he stands up from the board."*

## Notes
- Only use images you have the rights to. Wikimedia Commons is a good source; keep a `CREDITS.md`.
- The video is only as accurate as your script — fact-check it first.
- First run downloads a small local speech model for transcription.

Licence: MIT. Made for the ep17 tutorial on the channel.
