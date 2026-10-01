/**
 * Google tabulka „Balíček_leadership restart“ ← dotazník leadershiprestart.cz/darek
 *
 * Nasazení (jednorázově):
 * 1. V tabulce: Rozšíření → Apps Script, smazat obsah Code.gs a vložit celý tento soubor, uložit.
 * 2. Nasadit → Nové nasazení → typ „Webová aplikace“
 *    Spustit jako: Já · Kdo má přístup: Kdokoli → Nasadit → povolit přístup ke svému účtu.
 * 3. URL webové aplikace (…/exec) uložit do workeru:
 *    npx wrangler secret put DAREK_SHEET_URL
 * Při změně kódu: Nasadit → Spravovat nasazení → tužka → Verze: Nová verze (jinak běží starý kód).
 */
// ID tabulky „Balíček_leadership restart“ — skript tak funguje, i když není vytvořený přímo z tabulky.
var SHEET_ID = '1-8oJe3NvCIte0XnyzbdUeXumZ0VJ3msgYAaNsRS13Ro';
var LIST = 'Objednávky';
var TZ = 'Europe/Prague';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(LIST);
    if (!sh) return out({ ok: false, error: 'List ' + LIST + ' neexistuje' });
    var now = new Date();
    // Sloupce A–H: Jméno | Email | Telefon | Adresa | Sport | Pohyb | Datum | Čas (Status a Poznámky ručně).
    // Apostrof = uložit jako text: „+420 …“ by tabulka jinak četla jako vzorec (#ERROR!).
    sh.appendRow([
      txt(d.name),
      txt(d.email),
      txt(d.phone),
      txt(d.address),
      txt(d.sport),
      txt(d.hours),
      "'" + Utilities.formatDate(now, TZ, 'd/M/yyyy'),
      "'" + Utilities.formatDate(now, TZ, 'H:mm'),
    ]);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Text začínající = + - @ by se vyhodnotil jako vzorec → vždy uložit jako text.
function txt(v) {
  v = v == null ? '' : String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
