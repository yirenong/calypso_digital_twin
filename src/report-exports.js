import { reportSystems, formatReportNumber } from './reports.js'
const pdfText = value => String(value ?? 'Unavailable').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')

export async function createReportPdf(report) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit:'mm', format:'a4', compress:true })
  doc.setProperties({ title:report.title, subject:`${reportSystems[report.system]} - ${report.scope}`, author:'Calypso', creator:'Calypso Report Center' })
  const margin = 16, width = 178, bottom = 278
  let y = 20
  function space(height) { if (y + height > bottom) { doc.addPage(); y = 20 } }
  function paragraph(text, size = 10, color = [48,64,83]) {
    doc.setFont('helvetica','normal'); doc.setFontSize(size); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(pdfText(text), width)
    for (const line of lines) { space(5.2); doc.text(line, margin, y); y += 5.2 }
    y += 3
  }
  function heading(text) { space(20); y += 5; doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(28,82,103); doc.text(pdfText(text),margin,y); y += 8 }
  function table(columns, rows) {
    autoTable(doc, { startY:y, margin:{top:18,right:margin,bottom:20,left:margin}, head:[columns.map(pdfText)], body:rows.map(row => row.map(value => value === null ? 'Unavailable' : typeof value === 'number' ? formatReportNumber(value) : pdfText(value))),
      styles:{font:'helvetica',fontSize:8,cellPadding:2.5,overflow:'linebreak',textColor:[48,64,83],lineColor:[218,227,235],lineWidth:.1},
      headStyles:{fillColor:[29,57,77],textColor:255,fontStyle:'bold'}, alternateRowStyles:{fillColor:[245,248,250]}, rowPageBreak:'avoid', showHead:'everyPage',
    })
    y = doc.lastAutoTable.finalY + 5
  }
  doc.setFontSize(9); doc.setTextColor(59,122,142); doc.text('CALYPSO / SYSTEM REPORT',margin,y); y += 11
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(35,53,75)
  for (const line of doc.splitTextToSize(pdfText(report.title),width)) { doc.text(line,margin,y); y += 8 }
  y += 4
  paragraph(`Site: ${report.site}\nSystem: ${reportSystems[report.system]}\nScope: ${report.scope}\nRange: ${report.window}\nGenerated: ${report.generatedLabel}\nReport ID: ${report.id}`,9)
  if (report.from) paragraph(`Interval: ${report.period}\nFrom: ${report.from}\nTo: ${report.to}${report.coverage ? `\nData coverage: ${report.coverage}` : ''}`,9)
  paragraph(`${report.dataMode}. Local report snapshot; data coverage and assumptions are listed at the end.`,9,[100,116,133])
  heading('Executive summary'); paragraph(report.summary)
  table(['Metric','Value','Context'],report.metrics.map(m => [m.label,m.value === null ? 'Unavailable' : `${formatReportNumber(m.value)} ${m.unit}`,m.detail]))
  if (report.trend) {
    heading('Consumption profile'); space(62)
    const chartTop = y, chartBottom = y + 43, left = margin+13, right = 194
    const max = Math.max(1,...report.trend.values)
    doc.setFont('helvetica','normal'); doc.setFontSize(7)
    for (let i=0;i<5;i++) {
      const yy = chartTop+i*43/4
      doc.setDrawColor(225,232,238); doc.line(left,yy,right,yy)
      doc.setTextColor(105,120,138); doc.text(Intl.NumberFormat('en-SG',{notation:'compact',maximumFractionDigits:1}).format(max*(1-i/4)),left-2,yy+1,{align:'right'})
    }
    const points = report.trend.values.map((value,i) => [report.trend.values.length===1?(left+right)/2:left+i*(right-left)/(report.trend.values.length-1),chartBottom-value/max*43])
    doc.setDrawColor(56,135,160);doc.setFillColor(56,135,160);doc.setLineWidth(.55)
    points.forEach(([x,yy],i)=>{if(i)doc.line(points[i-1][0],points[i-1][1],x,yy);doc.circle(x,yy,.6,'F')})
    doc.setTextColor(105,120,138)
    doc.text(pdfText(report.trend.labels[0]),left,chartBottom+5)
    doc.text(pdfText(report.trend.labels.at(-1)),right,chartBottom+5,{align:'right'})
    y=chartBottom+12;paragraph(`${report.trend.unit} per interval, combined across selected blocks.`,8)
  }
  heading('Findings and observations')
  for (const finding of report.findings) { space(18); paragraph(`${finding.level}: ${finding.title}`,10,[28,82,103]); paragraph(finding.text) }
  heading('Recommended follow-up'); report.actions.forEach((action,i)=>paragraph(`${i+1}. ${action}`))
  for (const section of report.tables) { heading(section.title); table(section.columns,section.rows) }
  if (report.notes) { heading('Analyst notes'); paragraph(report.notes) }
  heading('Methodology and data coverage'); report.methodology.forEach((note,i)=>paragraph(`${i+1}. ${note}`,9))
  const pages = doc.getNumberOfPages()
  for(let page=1;page<=pages;page++) {
    doc.setPage(page);doc.setDrawColor(219,226,233);doc.setLineWidth(.2);doc.line(margin,284,194,284)
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(110,122,139)
    doc.text(pdfText(report.id),margin,290);doc.text(`Page ${page} of ${pages}`,194,290,{align:'right'})
  }
  return doc.output('arraybuffer')
}

export async function createReportExcel(report) {
  const [module, { buildReportWorkbook }] = await Promise.all([import('exceljs'), import('./report-workbook.js')])
  const workbook = await buildReportWorkbook(report, module.default || module)
  return workbook.xlsx.writeBuffer()
}
