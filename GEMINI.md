# Antigravity CLI Guidelines for Aarogya Grid Data + AI/ML

These rules configure the Antigravity agent for the Aarogya Grid project.

## 1. Data Science & Machine Learning (Deterministic Outputs)
- **Seed Everything**: Always set explicit random seeds for `numpy`, `pandas`, `scikit-learn`, and Python's `random` module (e.g., `RANDOM_SEED = 42`) in all data generation and modeling scripts.
- **Reproducibility**: All synthetic data generation (PHCs, medicines, footfall) must be strictly reproducible from the seed without external randomness.
- **Model Output constraints**: Ensure the regression models yield exactly the requested values (e.g., 18% upward trend, 3 days stock-out) through careful data engineering before training.

## 2. Google Cloud Platform
- **Vertex AI**: Prepare scripts to seamlessly transition from `scikit-learn` local models to Vertex AI custom training or AutoML.
- **Firebase/Firestore**: Mock and validate all Firestore document shapes before attempting batch writes. Use the exact schema defined in the design docs.
- **Cloud Run / Functions**: Optimize for cold-start times (< 5s). Prioritize lightweight imports (e.g., avoiding eager loading of massive ML libraries in the critical path).

## 3. Polyglot Parity (Python & Node.js)
- **Cross-Validation**: When translating logic (like risk score formulas) between Python and Node.js, ensure exact matching.
- **Integer Math**: Avoid floating-point drift. Truncate, round, or cast explicitly and test that `Math.round()` in JS matches `round()` or `int()` logic in Python according to requirements.

## 4. Quality Assurance & Formatting
- **Code Formatting**: Assume `ruff` and `black` for Python, and `prettier` for Node.js.
- **JSON Contracts**: Enforce strict JSON schema validation for all API inputs and outputs (especially `/forecast` and `/phcs/:id/stockout`). Do not add extra fields not specified in the contract.
