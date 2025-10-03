import jsPDF from "jspdf";

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  item_description: string;
  total_price: number;
  remaining_balance: number;
  status: string;
  created_at: string;
  delivery_required?: boolean;
  delivery_address?: any;
  delivery_fee?: number;
  delivery_status?: string;
}

interface Payment {
  id: string;
  payer_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
}

export function generateReceipt(order: Order, payments: Payment[]) {
  const doc = new jsPDF();
  
  // Set up colors
  const primaryColor: [number, number, number] = [41, 50, 97]; // Deep indigo
  const accentColor: [number, number, number] = [234, 179, 8]; // Gold
  
  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TAILOR SHOP', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Tailoring Services', 105, 30, { align: 'center' });
  
  // Receipt Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Receipt ID: ${order.id.substring(0, 8).toUpperCase()}`, 20, 55);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 62);
  
  // Customer Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Information', 20, 75);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${order.customer_name}`, 20, 85);
  doc.text(`Phone: ${order.phone}`, 20, 92);

  let currentY = 92;

  // Delivery Information
  if (order.delivery_required && order.delivery_address) {
    currentY += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Information', 20, currentY);
    
    currentY += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const address = order.delivery_address;
    doc.text(`Address: ${address.street}, House ${address.houseNumber}, ${address.city}`, 20, currentY);
    currentY += 7;
    doc.text(`Delivery Fee: ETB ${Number(order.delivery_fee || 0).toFixed(2)}`, 20, currentY);
    currentY += 7;
    doc.text(`Delivery Status: ${(order.delivery_status || 'pending').toUpperCase()}`, 20, currentY);
  }
  
  // Item Description
  currentY += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Item Description', 20, currentY);
  
  currentY += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const splitDescription = doc.splitTextToSize(order.item_description, 170);
  doc.text(splitDescription, 20, currentY);
  
  const descriptionHeight = splitDescription.length * 7;
  currentY = currentY + descriptionHeight + 10;
  
  // Payment Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Summary', 20, currentY);
  currentY += 10;
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(20, currentY, 170, 10, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 25, currentY + 7);
  doc.text('Method', 70, currentY + 7);
  doc.text('Amount', 160, currentY + 7);
  currentY += 10;
  
  // Payment rows
  doc.setFont('helvetica', 'normal');
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  
  payments.forEach((payment) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.text(new Date(payment.payment_date).toLocaleDateString(), 25, currentY + 7);
    doc.text(payment.payment_method.toUpperCase(), 70, currentY + 7);
    doc.text(`$${Number(payment.amount).toFixed(2)}`, 160, currentY + 7);
    currentY += 10;
  });
  
  // Total Summary
  currentY += 10;
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(20, currentY, 190, currentY);
  currentY += 8;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');

  // Show base price if delivery fee exists
  if (order.delivery_required && order.delivery_fee && order.delivery_fee > 0) {
    const basePrice = Number(order.total_price) - Number(order.delivery_fee);
    doc.text('Item Price:', 20, currentY);
    doc.text(`ETB ${basePrice.toFixed(2)}`, 190, currentY, { align: 'right' });
    currentY += 8;
    
    doc.text('Delivery Fee:', 20, currentY);
    doc.text(`ETB ${Number(order.delivery_fee).toFixed(2)}`, 190, currentY, { align: 'right' });
    currentY += 8;
  }

  doc.text('Total Price:', 20, currentY);
  doc.text(`ETB ${Number(order.total_price).toFixed(2)}`, 190, currentY, { align: 'right' });
  currentY += 8;
  
  doc.text('Total Paid:', 20, currentY);
  doc.setTextColor(0, 150, 0);
  doc.text(`ETB ${totalPaid.toFixed(2)}`, 190, currentY, { align: 'right' });
  currentY += 8;
  
  doc.setTextColor(0, 0, 0);
  if (order.remaining_balance > 0) {
    doc.text('Balance Due:', 20, currentY);
    doc.setTextColor(220, 38, 38);
    doc.text(`ETB ${Number(order.remaining_balance).toFixed(2)}`, 190, currentY, { align: 'right' });
  } else {
    doc.setTextColor(0, 150, 0);
    doc.text('PAID IN FULL', 105, currentY, { align: 'center' });
  }
  
  // Footer
  currentY = 270;
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business!', 105, currentY, { align: 'center' });
  doc.text('_______________________', 105, currentY + 10, { align: 'center' });
  doc.text('Authorized Signature', 105, currentY + 15, { align: 'center' });
  
  // Save PDF
  doc.save(`receipt-${order.customer_name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}
