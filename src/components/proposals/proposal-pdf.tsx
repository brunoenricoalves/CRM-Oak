import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

interface Item {
  service: string
  description: string | null
  value: number | string
  position: number
}

interface ProposalPdfProps {
  title: string
  items: Item[]
  logoBase64: string
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#0f172a' },
  header: {
    backgroundColor: '#2563eb',
    padding: 16,
    marginBottom: 28,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: { width: 70, height: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#0f172a' },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  totalRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    paddingRight: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    marginTop: 4,
  },
  colService: { width: '25%' },
  colDesc: { width: '50%' },
  colValue: { width: '25%', textAlign: 'right' },
  labelText: { fontSize: 9, color: '#64748b', fontWeight: 'bold' },
  valueText: { fontSize: 10, fontWeight: 'bold' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
})

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ProposalPdf({ title, items, logoBase64 }: ProposalPdfProps) {
  const total = items.reduce((sum, it) => sum + Number(it.value), 0)
  const today = new Date().toLocaleDateString('pt-BR')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoBase64} style={styles.logo} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Table header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colService, styles.labelText]}>SERVIÇO</Text>
          <Text style={[styles.colDesc, styles.labelText]}>DESCRIÇÃO</Text>
          <Text style={[styles.colValue, styles.labelText]}>VALOR</Text>
        </View>

        {/* Items */}
        {items.map((it, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colService}>{it.service}</Text>
            <Text style={styles.colDesc}>{it.description ?? ''}</Text>
            <Text style={styles.colValue}>{fmt(Number(it.value))}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={[styles.colService, styles.valueText]}>Total</Text>
          <Text style={styles.colDesc} />
          <Text style={[styles.colValue, styles.valueText]}>{fmt(total)}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Gerado em {today}</Text>
      </Page>
    </Document>
  )
}
