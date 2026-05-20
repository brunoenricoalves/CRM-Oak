import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

interface Item {
  service: string
  description: string | null
  value: number | string
}

interface ProposalPdfProps {
  title: string
  clientName?: string | null
  items: Item[]
  logoBase64: string
}

const OAK_BLUE = '#003DA5'
const OAK_BLUE_LIGHT = '#EEF4FF'
const TEXT_DARK = '#0f172a'
const TEXT_MID = '#475569'
const TEXT_FAINT = '#94a3b8'
const DIVIDER = '#e2e8f0'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: TEXT_DARK,
    backgroundColor: '#ffffff',
    paddingBottom: 56, // space for absolute footer
  },

  // ─── Logo header ─────────────────────────────────────────
  logoBar: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingLeft: 40,
    paddingRight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 3,
    borderBottomColor: OAK_BLUE,
  },
  logo: { width: 100, height: 28 },
  logoTagline: {
    fontSize: 7,
    color: TEXT_FAINT,
    fontFamily: 'Helvetica',
    letterSpacing: 1,
  },

  // ─── Hero ─────────────────────────────────────────────────
  hero: {
    backgroundColor: OAK_BLUE,
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 40,
    paddingRight: 40,
  },
  heroEyebrow: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 20,
    lineHeight: 1.25,
  },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroClientLabel: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  heroClientName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  heroDate: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.55)',
  },

  // ─── Content padding ──────────────────────────────────────
  body: {
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 32,
  },

  // ─── Section label ────────────────────────────────────────
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: OAK_BLUE,
    letterSpacing: 2,
    marginBottom: 14,
  },

  // ─── Table ────────────────────────────────────────────────
  tableHead: {
    flexDirection: 'row',
    backgroundColor: OAK_BLUE,
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: OAK_BLUE_LIGHT,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 4,
    marginTop: 3,
  },

  // ─── Columns ──────────────────────────────────────────────
  colService: { width: '28%' },
  colDesc: { flex: 1 },
  colValue: { width: '22%', textAlign: 'right' },

  thText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  tdService: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_DARK,
  },
  tdDesc: {
    fontSize: 9,
    color: TEXT_MID,
  },
  tdValue: {
    fontSize: 10,
    color: TEXT_DARK,
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: OAK_BLUE,
    flex: 1,
  },
  totalValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: OAK_BLUE,
    textAlign: 'right',
    width: '22%',
  },

  // ─── Validity note ────────────────────────────────────────
  note: {
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 20,
  },
  noteText: {
    fontSize: 7.5,
    color: TEXT_FAINT,
  },

  // ─── Footer ───────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: OAK_BLUE,
    paddingTop: 11,
    paddingBottom: 11,
    paddingLeft: 40,
    paddingRight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.6)',
  },
})

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ProposalPdf({ title, clientName, items, logoBase64 }: ProposalPdfProps) {
  const total = items.reduce((sum, it) => sum + Number(it.value), 0)
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Logo bar */}
        <View style={s.logoBar}>
          <Image src={logoBase64} style={s.logo} />
          <Text style={s.logoTagline}>AGÊNCIA DIGITAL</Text>
        </View>

        {/* Hero section */}
        <View style={s.hero}>
          <Text style={s.heroEyebrow}>PROPOSTA COMERCIAL</Text>
          <Text style={s.heroTitle}>{title}</Text>
          <View style={s.heroMeta}>
            <View>
              {clientName ? (
                <>
                  <Text style={s.heroClientLabel}>PREPARADO PARA</Text>
                  <Text style={s.heroClientName}>{clientName}</Text>
                </>
              ) : null}
            </View>
            <Text style={s.heroDate}>{today}</Text>
          </View>
        </View>

        {/* Services table */}
        <View style={s.body}>
          <Text style={s.sectionLabel}>ESCOPO DE SERVIÇOS</Text>

          {/* Table header */}
          <View style={s.tableHead}>
            <Text style={[s.colService, s.thText]}>SERVIÇO</Text>
            <Text style={[s.colDesc, s.thText]}>DESCRIÇÃO</Text>
            <Text style={[s.colValue, s.thText]}>VALOR</Text>
          </View>

          {/* index key is safe: single-pass server render */}
          {items.map((it, i) => (
            <View key={i} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
              <Text style={[s.colService, s.tdService]}>{it.service}</Text>
              <Text style={[s.colDesc, s.tdDesc]}>{it.description ?? ''}</Text>
              <Text style={[s.colValue, s.tdValue]}>{fmt(Number(it.value))}</Text>
            </View>
          ))}

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Validity note */}
        <View style={s.note}>
          <Text style={s.noteText}>
            Esta proposta é válida por 15 dias a partir da data de emissão. Os valores apresentados
            não incluem impostos aplicáveis.
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>OAK Agência Digital · Documento Confidencial</Text>
          <Text style={s.footerText}>Gerado em {today}</Text>
        </View>

      </Page>
    </Document>
  )
}
