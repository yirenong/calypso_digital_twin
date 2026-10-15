import { reportSystems } from './reports.js'

const colors = { navy:'183447', teal:'287E91', ink:'263B49', muted:'637585', pale:'F1F6F9', line:'DCE5EB', white:'FFFFFF' }
const numberFormat = '#,##0.00;[Red](#,##0.00);0.00'
const integerFormat = '#,##0;[Red](#,##0);0'
const fill = color => ({type:'pattern',pattern:'solid',fgColor:{argb:color}})

function chartImage(report) {
  if (typeof document === 'undefined') return null
  const source = report.tables.find(table => table.rows.some(row => Number.isFinite(row[1])))
  const trend = report.trend
  if (!trend && !source) return null
  const labels = trend?.labels || source.rows.map(row=>String(row[0]))
  const values = trend?.values || source.rows.map(row=>row[1])
  if (!values.some(Number.isFinite)) return null
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=440
  const ctx=canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,1440,440)
  ctx.fillStyle='#263B49';ctx.font='bold 22px Arial'
  ctx.fillText(trend ? 'Consumption profile' : source.columns[1],30,34)
  ctx.font='16px Arial';ctx.fillStyle='#637585'
  ctx.fillText(trend ? `${trend.unit} per ${report.period} interval` : 'Current readings by location',30,60)
  const x0=105,y0=100,w=1280,h=260
  const finite=values.filter(Number.isFinite),max=Math.max(1,...finite),min=Math.min(0,...finite)
  const y=value=>y0+h-(value-min)/(max-min)*h
  for(let i=0;i<=4;i++){
    const value=min+(max-min)*i/4,yy=y(value)
    ctx.strokeStyle='#E5EDF1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x0,yy);ctx.lineTo(x0+w,yy);ctx.stroke()
    ctx.fillStyle='#637585';ctx.textAlign='right';ctx.fillText(Intl.NumberFormat('en-SG',{notation:'compact',maximumFractionDigits:1}).format(value),x0-14,yy+5)
  }
  if(trend){
    ctx.strokeStyle='#287E91';ctx.lineWidth=4;ctx.beginPath();let started=false
    values.forEach((value,index)=>{if(!Number.isFinite(value)){started=false;return}const x=x0+(values.length===1?.5:index/(values.length-1))*w;if(!started){ctx.moveTo(x,y(value));started=true}else ctx.lineTo(x,y(value))});ctx.stroke()
    if(values.length===1){ctx.fillStyle='#287E91';ctx.beginPath();ctx.arc(x0+w/2,y(values[0]),6,0,Math.PI*2);ctx.fill()}
  }else{
    const slot=w/values.length
    values.forEach((value,index)=>{if(!Number.isFinite(value)){ctx.fillStyle='#637585';ctx.font='14px Arial';ctx.textAlign='center';ctx.fillText('Unavailable',x0+(index+.5)*slot,y0+h-12,slot*.9);return}ctx.fillStyle='#287E91';ctx.fillRect(x0+index*slot+slot*.22,Math.min(y(value),y(0)),slot*.56,Math.max(2,Math.abs(y(0)-y(value))))})
  }
  ctx.font='16px Arial';ctx.fillStyle='#637585'
  const step=Math.max(1,Math.ceil(labels.length/6))
  labels.forEach((label,index)=>{if(index%step && index!==labels.length-1)return;if(labels.length>7 && index!==labels.length-1 && index>labels.length-1-step)return;const x=trend?x0+(labels.length===1?.5:index/(labels.length-1))*w:x0+(index+.5)*w/labels.length;ctx.textAlign=index===0?'left':index===labels.length-1?'right':'center';ctx.fillText(String(label),x,y0+h+32,200)})
  return canvas.toDataURL('image/png')
}

export async function buildReportWorkbook(report, ExcelJS) {
  const workbook=new ExcelJS.Workbook()
  workbook.creator='Calypso';workbook.created=new Date(report.generatedAt);workbook.modified=new Date(report.generatedAt)
  workbook.title=report.title;workbook.subject=`${reportSystems[report.system]} — ${report.scope}`
  workbook.company=report.site;workbook.description='Generated report snapshot. Numeric values retain their source units and reporting scope.'
  function sheet(name,lastColumn,tabColor) {
    const ws=workbook.addWorksheet(name,{
      properties:{tabColor:{argb:tabColor},defaultRowHeight:21},
      views:[{showGridLines:false,zoomScale:85}],
      pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.3,right:.3,top:.4,bottom:.4,header:.15,footer:.15}},
      headerFooter:{oddFooter:'&LCalypso  ·  '+report.id+'&RPage &P of &N'},
    })
    ws.getColumn(1).width=3
    for(let column=2;column<=lastColumn;column++)ws.getColumn(column).width=18
    return ws
  }
  function text(ws,row,first,last,value,{size=11,bold=false,color=colors.ink,background,wrap=true,height=24}={}) {
    if(last>first)ws.mergeCells(row,first,row,last)
    const cell=ws.getCell(row,first);cell.value=value
    cell.font={name:'Arial',size,bold,color:{argb:color}}
    cell.alignment={vertical:'middle',wrapText:wrap}
    if(background)cell.fill=fill(background)
    ws.getRow(row).height=height
    return cell
  }
  function heading(ws,title,last) {
    text(ws,2,2,last,title,{size:16,bold:true,height:32})
    text(ws,3,2,last,`${report.site}   ·   ${reportSystems[report.system]}   ·   ${report.dataMode}`,{size:10,color:colors.muted})
    for(let col=2;col<=last;col++)ws.getCell(4,col).border={bottom:{style:'thin',color:{argb:colors.teal}}}
    ws.getRow(4).height=8
  }
  function section(ws,row,title,last) {
    text(ws,row,2,last,title,{bold:true,color:colors.navy,background:colors.pale,height:27})
    return row+1
  }
  let tableId=0
  function table(ws,row,columns,rows) {
    const last=columns.length+1
    ws.addTable({name:`ReportTable${++tableId}`,ref:`B${row}`,headerRow:true,totalsRow:false,style:{theme:'TableStyleMedium2',showRowStripes:true},columns:columns.map(name=>({name,filterButton:true})),rows:rows.map(values=>values.map(value=>value==null?'Unavailable':value))})
    ws.getRow(row).height=32
    for(let r=row;r<=row+rows.length;r++){
      let lines=1
      for(let col=2;col<=last;col++){
        const cell=ws.getCell(r,col)
        cell.font={name:'Arial',size:10,bold:r===row,color:{argb:r===row?colors.white:colors.ink}}
        cell.alignment={vertical:'middle',wrapText:true,indent:r===row?0:1,horizontal:r===row?'center':typeof cell.value==='number'?'right':'left'}
        if(r===row)cell.fill=fill(colors.navy)
        if(typeof cell.value==='number')cell.numFmt=Number.isInteger(cell.value)?integerFormat:numberFormat
        lines=Math.max(lines,...String(cell.value??'').split('\n').map(part=>Math.ceil(part.length/Math.max(10,ws.getColumn(col).width-3))))
      }
      ws.getRow(r).height=Math.max(r===row?32:25,Math.min(409,lines*14+9))
    }
    if(!rows.length)text(ws,row+1,2,last,'No records in the selected scope.',{color:colors.muted,height:28})
    return row+Math.max(1,rows.length)+3
  }
  const summary=sheet('Report summary',13,colors.navy)
  for(let column=2;column<=13;column++)summary.getColumn(column).width=11
  heading(summary,report.title,13)
  text(summary,5,2,13,`Scope: ${report.scope}`,{size:10,height:30})
  text(summary,6,2,13,report.from?`Interval: ${report.period}   ·   From: ${report.from}   ·   To: ${report.to}`:`Range: ${report.window}`,{size:10,height:30})
  text(summary,7,2,13,`Generated: ${report.generatedLabel}   ·   ${report.id}`,{size:10,color:colors.muted})
  text(summary,8,2,13,report.summary,{height:44})
  report.metrics.forEach((metric,index)=>{
    const col=2+(index%4)*3,row=10+Math.floor(index/4)*5
    text(summary,row,col,col+2,`${metric.label}${metric.unit?` (${metric.unit})`:''}`,{size:10,bold:true,background:colors.pale,height:32})
    const value=text(summary,row+1,col,col+2,metric.value??'Unavailable',{size:16,bold:true,color:colors.teal,height:32})
    value.alignment={horizontal:'left',vertical:'middle'}
    if(typeof metric.value==='number')value.numFmt=['people','assets','cameras','views','meters','alerts'].includes(metric.unit)?integerFormat:numberFormat
    text(summary,row+2,col,col+2,metric.detail,{size:10,color:colors.muted,height:46})
    summary.getRow(row+3).height=8;summary.getRow(row+4).height=8
  })
  const chart=chartImage(report),chartRow=10+Math.ceil(report.metrics.length/4)*5
  if(chart){
    const image=workbook.addImage({base64:chart,extension:'png'})
    for(let r=chartRow;r<chartRow+15;r++)summary.getRow(r).height=20
    summary.addImage(image,{tl:{col:1,row:chartRow-1},br:{col:13,row:chartRow+14},editAs:'oneCell'})
  }
  summary.pageSetup.printArea=`B2:M${chart?chartRow+15:chartRow}`

  const last=Math.max(6,...report.tables.map(table=>table.columns.length+1))
  const details=sheet('Detailed data',last,colors.teal)
  const widths=[30,32,28,27,28,27,28,27]
  for(let col=2;col<=last;col++)details.getColumn(col).width=widths[col-2]||26
  heading(details,'Detailed data',last)
  text(details,5,2,last,`${report.scope}   ·   ${report.window}`,{size:10,color:colors.muted,height:30})
  let row=7
  for(const item of report.tables){row=section(details,row,item.title,last);row=table(details,row,item.columns,item.rows)}
  if(!report.tables.length)text(details,row,2,last,'No detailed tables were requested.',{color:colors.muted})
  details.views=[{showGridLines:false,state:'frozen',ySplit:8,xSplit:2,zoomScale:85}]
  details.pageSetup.printTitlesRow='1:5';details.pageSetup.printArea=`B2:${details.getColumn(last).letter}${Math.max(row-2,8)}`

  const review=sheet('Review and methodology',6,colors.muted)
  review.getColumn(2).width=17;review.getColumn(3).width=36;review.getColumn(4).width=45;review.getColumn(5).width=28;review.getColumn(6).width=24
  heading(review,'Review and methodology',6)
  text(review,5,2,6,`${report.scope}   ·   ${report.window}`,{size:10,color:colors.muted,height:30})
  row=section(review,7,'Findings and observations',6)
  for(const finding of report.findings){text(review,row,2,6,`${finding.level}: ${finding.title}`,{bold:true,height:26});row++;text(review,row,2,6,finding.text,{height:Math.max(34,Math.ceil(finding.text.length/125)*16+10)});row+=2}
  row=section(review,row,'Recommended follow-up',6)
  report.actions.forEach((action,index)=>{text(review,row,2,2,index+1,{bold:true,color:colors.teal});text(review,row,3,6,action,{height:Math.max(34,Math.ceil(action.length/105)*16+10)});row++})
  row+=2
  if(report.notes){row=section(review,row,'Analyst notes',6);for(const paragraph of report.notes.split('\n')){text(review,row,2,6,paragraph,{height:Math.max(24,Math.ceil(paragraph.length/125)*16+10)});row++}row+=2}
  row=section(review,row,'Methodology and data coverage',6)
  for(const note of report.methodology){text(review,row,2,6,note,{size:10,color:colors.muted,height:Math.max(30,Math.ceil(note.length/135)*15+10)});row++}
  review.pageSetup.printArea=`B2:F${row}`
  return workbook
}
