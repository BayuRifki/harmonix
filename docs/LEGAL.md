# Harmonix — Legal Disclaimer & Compliance

> **⚠️ Read this carefully before using, contributing to, or distributing Harmonix.**

---

## TL;DR

Harmonix integrates with third-party music services. **Users are responsible for complying with the Terms of Service of each service they connect to.** The Harmonix project is not affiliated with, endorsed by, or sponsored by Spotify, YouTube, Google, or any other music provider.

---

## 1. Project Intent

Harmonix is a **personal music player** that aggregates content from sources you already have access to. It is designed to be used with accounts and subscriptions you already own.

**Harmonix does NOT:**
- ❌ Provide a music catalog
- ❌ Host or distribute copyrighted music
- ❌ Circumvent DRM
- ❌ Bypass paywalls
- ❌ Enable unauthorized access to content

**Harmonix DOES:**
- ✅ Provide a unified interface for sources you authorize
- ✅ Use official APIs where available
- ✅ Clearly label unofficial integrations
- ✅ Respect user-controlled settings

---

## 2. Spotify Integration

### Status: **Official API (with limitations)**

Harmonix uses the [Spotify Web API](https://developer.spotify.com/documentation/web-api/) and [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk/).

### Requirements

- Users must have a **Spotify account** (Free or Premium).
- **Premium users** get full playback.
- **Free users** get 30-second previews only (Spotify API limitation).
- The Harmonix app must be registered in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).

### Compliance

By using Harmonix with Spotify, you agree to:
- [Spotify Developer Terms of Service](https://developer.spotify.com/terms/)
- [Spotify Terms of Use](https://www.spotify.com/legal/end-user-agreement/)
- [Spotify Privacy Policy](https://www.spotify.com/legal/privacy-policy/)

### Branding

When displaying Spotify content, Harmonix must show Spotify branding and link to the source. This is implemented in the UI.

### Scope Restrictions

The Spotify API has strict rules:
- We **cannot** cache or store Spotify audio files.
- We **cannot** display Spotify content without attribution.
- We **cannot** use Spotify data to train AI/ML models.

---

## 3. YouTube Music Integration

### Status: **⚠️ UNOFFICIAL — USE AT YOUR OWN RISK**

YouTube Music does **not** provide a public API for third-party apps. Harmonix uses unofficial methods to access YouTube Music content:

- **`youtubei.js`** for search and metadata
- **`yt-dlp`** for stream URL resolution

### ⚠️ Risks

1. **Terms of Service Violation**: YouTube's [Terms of Service](https://www.youtube.com/static?template=terms) explicitly prohibit:
   - Accessing content through means other than the official YouTube player
   - Downloading or extracting audio/video streams
   - Circumventing technological measures

2. **Account Risk**: YouTube may flag or ban accounts that use unofficial methods.

3. **Breakage**: The unofficial methods can break at any time without notice.

4. **Legal Risk**: Depending on your jurisdiction, extracting streams may violate copyright laws.

### Disclaimers (Displayed in UI)

On first use of the YouTube Music source, Harmonix shows:

> **Unofficial Integration Notice**
>
> This feature uses unofficial methods to access YouTube Music. By proceeding, you acknowledge:
>
> - This may violate YouTube's Terms of Service.
> - Your account may be flagged or restricted.
> - This feature may break without notice.
> - You are solely responsible for any consequences.
>
> Harmonix and its contributors are not liable for any damages or account actions resulting from use of this feature.
>
> [I Understand and Accept] [Cancel]

### Recommendation

If you want to support artists and stay safe, use the official YouTube Music app or YouTube Premium.

---

## 4. Local Files

Local file playback is **100% legal** — you play files you already own on your computer. Harmonix does not ship any music files.

Users are responsible for ensuring they have the right to play the files in their library.

---

## 5. Future Sources

When adding new sources (Deezer, Jamendo, Audius, etc.), contributors must:

1. **Check the source's Terms of Service** before implementing.
2. **Use official APIs** whenever possible.
3. **Display appropriate disclaimers** for unofficial integrations.
4. **Document legal requirements** in this file.
5. **Never include DRM circumvention** code.

Open-source / royalty-free sources like **Jamendo** and **Audius** are encouraged as safer alternatives.

---

## 6. Privacy

Harmonix is a **local desktop application**. By default:

- ✅ No telemetry or analytics
- ✅ No data sent to Harmonix servers (there are none)
- ✅ Library data stays on your machine
- ✅ OAuth tokens stored locally via OS-level encryption

When you use Spotify or YouTube Music integrations, those services receive requests as if you were using their official apps. See their respective privacy policies.

---

## 7. Distribution

If you fork or redistribute Harmonix:

- **Keep all disclaimers intact** (especially the YouTube Music notice).
- **Do not claim official affiliation** with Spotify, YouTube, or any music provider.
- **Comply with the MIT License** terms.
- **Do not use Spotify/YouTube trademarks** in your fork's name or branding without permission.

---

## 8. No Warranty

HARMONIX IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 9. Reporting Legal Concerns

If you believe Harmonix violates your rights or the rights of a service you represent:

1. **Open a GitHub issue** with the `[Legal]` tag.
2. **Do not** file a DMCA takedown without contacting us first — we're happy to remove problematic code.

---

## 10. Changes to This Document

This document may be updated as the project evolves. Major changes will be noted in [`CHANGELOG.md`](../CHANGELOG.md).

**Last updated**: Initial version (Phase 0)
