# Arbuz Express

An interactive take on the "monkey drives a watermelon train" clip. You steer the monkey, collect fruit halves and the train grows. Everything is rendered at 144p to 360p on purpose and pushed through a fake video-compression shader, and the music runs through a bitcrusher.

Five channels: the original watermelon meadow, a desert, a Bollywood palace, outer space and a cursed 3 AM version.

## Controls

- A / D or arrows: steer (on a phone hold the left or right half of the screen)
- Space: hop, the wagons follow in a wave
- H: horn
- Shift: bass boost
- C: camera (chase, like the clip, drone)
- 1 to 5: channel, Q: quality, M: mute, Esc: menu

## Stack

three.js from a CDN as ES modules, no build step. Every texture is painted on a canvas at load. Open `index.html` through any static server.

## Credits

- Clip in `assets/video/malpa.mp4` and its soundtrack (`arbuz.mp3`): the original meme video, author unknown.
- `bollywood.mp3`: excerpt of "Tunak Tunak Tun" by Daler Mehndi.
- `habibi.mp3`: the Nokia Arabic ringtone.
- `kosmos.mp3`: the Afia oil jingle.
- Sound effects, all CC0 from freesound.org:
  - `honk.mp3`: "Honk! (Vintage Bicycle Horn)" by Breviceps (468441)
  - `malpa.mp3`: "S27-30 Chimpanzee Loud screams" by craigsmith (675430)
  - `plop.mp3`: "Plop!" by Breviceps (447910)
  - `szum.mp3`: "Sound interference" by Breviceps (445105)

Music and the clip belong to their owners and are used here as a parody.
