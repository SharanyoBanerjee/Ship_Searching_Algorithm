# Ship Searching Algorithm ([Deployed Link](https://shipsearchalgo.netlify.app/))
## The Ship Searching Algorithm Project is designed to find a missing ship in a vast ocean using probability theory and Bayesian reasoning. 



## Unlike simple searching simulators , this project uses :
- Any random possible ship placement and grid dimensions.
- Realtime Heatmap Change Visualization.
- Choses easy yet effective symmetical approach.

## It demonstrates how **mathematics + algorithms** can drastically improve search efficiency.

# Core Idea:
## What is the question that comes to mind in this specific scenerio:
"Where is the ship most likely to be, given everything we know so far?"

Instead of guessing randomly, we:
- Consider **all valid ship placements**
- Remove impossible ones using feedback (hit/miss)
- Compute probability of each cell
- Always pick the **highest probability cell**

# The Mathematics Behind this:
**Sample Space**: The sample space is the number of boxes or blocks in the grid (if it is `10 x 10` grid , then the sample space here will be 100 blocks or 100 square units).

**Grid Distribution**:
Let:
- Grid size = `X × Y`
- Ship size = `k`
- Horizontal placements: `Y × (X - k + 1)`
- Vertical Placements: `X × (Y - k + 1)`
So, Total Possible Valid Placements = `Y(X - k + 1) + X(Y - k + 1)`

**Intution**:
Each placement is considered **equally likely initially**.
  
**Probability Model**
Let ,
- `S` = set of valid ship placements  
- `N` = `|S|`

For any cell `c`:
- P(c) = (Number of placements covering c) / (Total valid placements)

**Bayesian Update**
After each move:
- Case 1: MISS at `(x, y)`
  Remove all placements that include that cell:
  S = { p ∈ S | (x,y) NOT in p }
- Case 2: HIT at `(x, y)`
  Keep only placements that include that cell:
  S = { p ∈ S | (x,y) ∈ p }

**Bayesian reasoning:**
- P(H | evidence) ∝ P(evidence | H) × P(H)
- Since all placements are equally likely, We simply filter valid placements instead of computing full probability formulas.

**Probability Distribution**
- For each cell:
  P(c) = overlap_count(c) / |S|
Where:
- `overlap_count(c)` = number of placements covering that cell

**Optimal Move**
- The next move is: `arg max P(c)`

**Algorithm Workflow**
- Step 1: Generate placements
- Step 2: Initialize probabilities
- Step 3: On each move
- If Miss then `applyMiss(x, y)` else if HIT `applyHit(x, y)`
- Recalculate the Probabilities
- Step 4: Pick the next best move

## Code Architecture:

**1. ProbabilityEngine**

Functionality : Handles all mathematics and logic
- Responsibilities:
- Generate placements
- Track hits and misses
- Filter valid states
- Compute probabilities

**Key Methods:**

- generatePlacements()
- Creates all possible ship positions
- isInside(placement, x, y)
- Checks if a cell belongs to a placement
- applyMiss(x, y)
- Removes invalid placements
- applyHit(x, y)
- Keeps only valid placements
- updateProbabilities()
- Core probability logic: `overlapCounts[index]++; probability = overlapCounts[index] / placements.length;`

**2. CanvasRenderer**

Functionality : Handles visualization
Features:
- Heatmap rendering
- Zoom system
- Hover probability display
- Hit/Miss highlighting

Color Logic:
- Dark → low probability
- Bright → high probability
- Highlight → best move

**3. BattleshipGame**

Controls game flow
Responsibilities:
- Mode switching (Player / Computer)
- Handling clicks
- Managing game state
- AI decision-making

**4. AI Strategy**

- Probability Maximization
  Always selects: Cell with maximum probability
- Tie-breaker Logic
  When multiple best moves exist: Checkerboard Optimization `(x + y) % 2 === 0`
  Reason:
- Ships occupy multiple cells
- Reduces search space by ~50%
- Center Bias : **distance from center minimized**
  Reason : More placements overlap near the center

**5. Time Complexity**

- Placement generation: `O(X × Y)`
- Probability update: `O(P × k)` where `P` is remaining placements and `k` ship size

**6. Efficiency Metic**

- `ideal = log2(total placements)` & `efficiency = ideal / moves`
- Measures closeness to optimal search
- Inspired by information theory

Features:
- Interactive grid
- Real-time probability heatmap
- AI auto-play mode
- Ship placement mode
- Zoom & visualization
- Decision timeline log

## Why This Project Matters
This project demonstrates:
- Probability distributions
- Bayesian inference
- Search optimization
- Heuristic-based AI
- Decision-making under uncertainty






