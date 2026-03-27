const htmlPdf = require('html-pdf-node');
const QRCode  = require('qrcode');

async function generatePDF(request) {
  const verifyUrl = `http://192.168.254.166:5500/frontend/verify.html?id=${request.id}`;
  const qrBase64  = await QRCode.toDataURL(verifyUrl);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 40px 60px; }
    .header { text-align: center; margin-bottom: 10px; }
    .header img { width: 70px; height: 70px; margin-bottom: 6px; }
    .header h3 { font-size: 13px; font-weight: normal; margin: 2px 0; }
    .header h2 { font-size: 15px; font-weight: bold; margin: 2px 0; }
    .header h1 { font-size: 17px; font-weight: bold; margin: 2px 0; }
    .divider { border: none; border-top: 2px solid #000; margin: 10px 0; }
    .divider-thin { border: none; border-top: 1px solid #000; margin: 6px 0; }
    .doc-title { text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 20px 0 6px; text-decoration: underline; text-transform: uppercase; }
    .doc-number { text-align: center; font-size: 11px; color: #444; margin-bottom: 20px; }
    .body-text { text-align: justify; line-height: 1.9; margin-bottom: 14px; font-size: 13px; }
    .body-text b { text-transform: uppercase; }
    .signatory { margin-top: 50px; }
    .signatory-block { text-align: center; display: inline-block; width: 45%; }
    .signatory-block .name { font-weight: bold; font-size: 14px; text-transform: uppercase; border-top: 1px solid #000; padding-top: 4px; margin-top: 50px; }
    .signatory-block .title { font-size: 11px; }
    .signatory-right { float: right; }
    .or-box { border: 1px solid #000; padding: 6px 12px; font-size: 11px; margin-bottom: 20px; display: inline-block; }
    .qr-section { position: fixed; bottom: 40px; right: 60px; text-align: center; }
    .qr-section img { width: 80px; height: 80px; }
    .qr-section p { font-size: 9px; color: #666; margin-top: 3px; }
    .footer-line { position: fixed; bottom: 130px; left: 60px; right: 60px; border-top: 1px solid #ccc; }
    .doc-id { position: fixed; bottom: 40px; left: 60px; font-size: 9px; color: #888; }
    .clearfix::after { content: ""; display: table; clear: both; }
  </style>
</head>
<body>

  <div class="header">
    <h3>Republic of the Philippines</h3>
    <h3>Province of _______________</h3>
    <h2>Municipality / City of _______________</h2>
    <h1>BARANGAY _______________</h1>
  </div>

  <hr class="divider"/>
  <hr class="divider-thin"/>

  <p class="doc-title">${request.document_name}</p>
  <p class="doc-number">Doc. No. ${request.doc_number} &nbsp;&nbsp; Series of ${new Date().getFullYear()}</p>

  <p class="body-text">TO WHOM IT MAY CONCERN:</p>

  <p class="body-text">
    This is to certify that <b>${request.resident_name?.toUpperCase()}</b>, ${request.age} years of age,
    <b>${request.civil_status?.toUpperCase()}</b>, and a bonafide resident of this barangay, is personally
    known to me and to the community to be a person of good moral character and has no
    derogatory record on file in this office.
  </p>

  <p class="body-text">
    This certification is being issued upon the request of the above-named person in
    connection with <b>${request.purpose?.toUpperCase()}</b> and for whatever legal purpose it may serve.
  </p>

  <p class="body-text">
    Issued this <b>${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</b>
    at the Office of the Barangay, Philippines.
  </p>

  <div class="or-box">
    O.R. No.: _______________ &nbsp;&nbsp; Amount Paid: ₱ _______________
  </div>

  <div class="signatory clearfix">
    <div class="signatory-block">
      <div class="name">_______________</div>
      <div class="title">Requesting Party / Signature</div>
    </div>
    <div class="signatory-block signatory-right">
      <div class="name">HON. _______________</div>
      <div class="title">Punong Barangay</div>
    </div>
  </div>

  <div class="footer-line"></div>
  <div class="doc-id">Document ID: ${request.id} &nbsp;|&nbsp; Verify at: ${verifyUrl}</div>

  <div class="qr-section">
    <img src="${qrBase64}" alt="QR Code"/>
    <p>Scan to verify</p>
  </div>

</body>
</html>`;

  const file    = { content: html };
  const options = {
    format: 'A4',
    margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    printBackground: true,
  };

  const pdfBuffer = await htmlPdf.generatePdf(file, options);
  return pdfBuffer;
}

module.exports = generatePDF;