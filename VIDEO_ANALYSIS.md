# Video Analysis

## Privacy First

- Videos are private by default
- No model training on private videos without explicit consent
- Videos stored in user-protected Supabase Storage
- RLS policies prevent cross-user access

## Architecture

Behind a provider interface:

- `VideoAnalysisProvider` interface
- `ManualReviewProvider` (default, no API key required)
- `OnDevicePoseProvider` (future)
- `CloudPoseProvider` (future)

## Manual Fallback

V1 supports:

- Record / upload / trim video
- Mark attempt start/end
- Associate with set or skill attempt
- Frame-by-frame review
- Self-review notes

## AI Confidence

Any automated analysis displays confidence and never presents uncertain analysis as fact. Expert skills are not unlocked from low-confidence AI.
