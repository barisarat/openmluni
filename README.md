# openmluni

A local player for full university lecture series on YouTube selected from MIT, Stanford, CMU, Berkeley, ETH and more. The local app is designed to keep a focused workplace for these public courses, so you get:

1. selected courses starterkit, 

2. watch lectures and save your progess without youtube recommendations and noise around the video so you have a better environment for learning, 

4. all private and configurable, only needs Node to serve.


## Run

Requires Node 18 or newer.

```sh
git clone https://github.com/barisarat/openmluni.git
cd openmluni
node server.js
```

Default port is 4000 and progress (`progress.json`, `bookmarks.json`) is saved to `STATE_DIR` with default `~/.local/share/openmluni`. For different configs an example run is:

```sh
PORT=5000 STATE_DIR=~/notes/openmluni node server.js
```

For different OS, check out the reference table: 

| OS      | Default location                        | Set it yourself                                                                                |
| ------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Linux   | `~/.local/share/openmluni`              | `PORT=5000 STATE_DIR=~/notes/openmluni node server.js`                                         |
| macOS   | `~/.local/share/openmluni`              | `PORT=5000 STATE_DIR=~/notes/openmluni node server.js`                                         |
| Windows | `C:\Users\<you>\.local\share\openmluni` | `$env:PORT=5000; $env:STATE_DIR="C:\Users\<you>\notes\openmluni"; node server.js` (PowerShell) |


## Cross Device Setup:

The server binds to 127.0.0.1 and has no login. To use it from another
device, you can use something like Tailscale to share your progress across devices without public access.


## Practical Notes:

- Lectures resume from the last stopped point (with a few seconds lag)
- Tick a video to mark it watched, it is not auto completed. 
- Bookmark to show the course in the Home page.
- Light or dark UI follows your system theme.
- A few uploaders disable embedding (some Stanfords Online courses at the moment). Those show "Video unavailable" in the player, you can watch them on YouTube and tick them as completed here.
- If you have Youtube premium, no ads feature applies here as well with no configuration. 


## Adding a course

1. Open the course's playlist on YouTube (any page whose URL has `list=`).
   For long playlists, scroll to the bottom first to load all videos.
2. Paste `extract-playlist-course.js` into the browser devtools console and
   run it. The course JSON lands on your clipboard.
3. Save it as `data/<slug>.json` (the filename is the course slug) and fill
   in `name`, `category` and `desc`.

The shape:

```json
{ "name": "...", "category": "CS", "desc": "...",
  "lectures": [ { "id": "L01", "title": "...",
                  "parts": [ { "id": "L01.1", "title": "...", "videoId": "..." } ] } ] }
```

Part ids are the keys your progress is stored, so keep them stable once the course is added. Contributions of complete, publicly available, high-quality and related lecture series are welcome as pull requests.


## Current Courses

CS:

- Big Data for Engineers
- CMU 11-711 Advanced NLP Fall 2025
- CS 162: Operating Systems and Systems Programming - Berkeley
- ESSIR 2024 European Summer School in Information Retrieval
- Harvard COMPSCI 224 Advanced Algorithms
- Information Retrieval
- Information Systems for Engineers
- Jeff Heaton Applications of Deep Neural Networks (PyTorch)
- Jeff Heaton Applications of Generative Artificial Intelligence
- MIT 18.065 Matrix Methods in Data Analysis, Signal Processing, and Machine Learning
- MIT 6.0002 Introduction to Computational Thinking and Data Science
- Machine Learning with Sebastian Raschka
- NYU Deep Learning
- Sebastian Raschka Build a Large Language Model from Scratch
- Stanford CS229 Machine Learning
- Stanford CS231n: CNNs for Visual Recognition
- Stanford CS336 Language Modeling from Scratch 2026
- Stanford Statistical Learning with R
- Stanford XCS224U Natural Language Understanding
- TU Wien Advanced Information Retrieval 2021
- UC Berkeley CS186: Introduction to Database Systems

MATH:

- Ben Lambert A Full Course in Econometrics - Undergraduate Level
- Ben Lambert A Graduate Course in Econometrics
- Ben Lambert A Student's Guide to Bayesian Statistics
- Ben Lambert Factor Analysis and SEM
- Cache Lack Design of Experiments
- Cache Lack Probability and Measure
- Cache Lack Time Series Analysis
- MIT 14.310x Data Analysis for Social Scientists
- MIT 18.06 Linear Algebra
- MIT 18.650 Statistics for Applications
- MIT RES.6-012 Introduction to Probability
- Mathematical Modelling
- Stanford CS109 Probability for Computer Scientists
- Stanford EE364A Convex Optimization
- Statistical Rethinking 2026
- Steve Brunton Singular Value Decomposition

FIN:

- Financial Markets Microstructure (UCPH)
- Topics in Mathematics with Applications in Finance

WRITING:

- Stanford Writing in the Sciences

## License

Code: MIT (see LICENSE). `data/` is metadata only (titles and
YouTube video ids) and is public domain (CC0). The lecture contents belong to their creators and play through YouTube's embedded player.