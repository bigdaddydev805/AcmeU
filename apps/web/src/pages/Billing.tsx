import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, CreditCard, Gift, Receipt, ShoppingCart } from 'lucide-react';
import { Badge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardFooter, CardHeader, PageHeader } from '../components/Card';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { StatTile } from '../components/StatTile';
import { Table, type Column } from '../components/Table';
import { useToast } from '../components/Toast';
import { api, errorMessage, getJson } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../lib/format';
import {
  atLeast,
  type Course,
  type CreditLedgerEntry,
  type CreditsResponse,
  type Envelope,
  type Invoice,
  type Order,
  type Paginated,
  type PaymentMethod,
} from '../lib/types';

function TransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('10');
  const [note, setNote] = useState('');

  const transfer = useMutation({
    mutationFn: () =>
      api.post('/billing/credits/transfer', {
        toUserId,
        amount: Number(amount),
        note: note || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['billing', 'credits'] });
      toast.success('Credits transferred');
      setToUserId('');
      setNote('');
      onClose();
    },
    onError: (error) => toast.error('Transfer failed', errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transfer credits"
      description="Move learning credits to another member of your workspace."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={transfer.isPending}
            disabled={!toUserId || !amount}
            onClick={() => transfer.mutate()}
          >
            Send credits
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Recipient user ID"
          hint="You can find this on the recipient's profile page."
          value={toUserId}
          onChange={(event) => setToUserId(event.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
        />
        <Input
          label="Amount"
          type="number"
          min={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Textarea
          label="Note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Q3 enablement budget"
        />
      </div>
    </Modal>
  );
}

function PurchaseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [courseId, setCourseId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [couponCode, setCouponCode] = useState('');

  const courses = useQuery({
    queryKey: ['courses', { pageSize: 100, sort: 'title', direction: 'asc' }],
    queryFn: () =>
      getJson<Paginated<Course>>('/courses', {
        params: { pageSize: 100, sort: 'title', direction: 'asc' },
      }),
    enabled: open,
  });

  const order = useMutation({
    mutationFn: () =>
      api.post('/billing/orders', {
        courseId,
        quantity: Number(quantity),
        couponCode: couponCode || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['billing', 'orders'] });
      toast.success('Order created', 'It will complete once payment settles.');
      onClose();
    },
    onError: (error) => toast.error('Could not create the order', errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Purchase seats"
      description="Buy seats for a course in your catalog."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={order.isPending} disabled={!courseId} onClick={() => order.mutate()}>
            Create order
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Course"
          placeholder="Select a course"
          options={(courses.data?.data ?? []).map((course) => ({
            value: course.id,
            label: `${course.code} — ${course.title} (${formatCurrency(course.priceCents)})`,
          }))}
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
        />
        <Input
          label="Seats"
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <Input
          label="Coupon code"
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value)}
          placeholder="TEAM-2026"
        />
      </div>
    </Modal>
  );
}

export default function Billing() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [transferring, setTransferring] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [coupon, setCoupon] = useState('');

  const canSeeInvoices = atLeast(user?.role, 'manager');

  const credits = useQuery({
    queryKey: ['billing', 'credits'],
    queryFn: () => getJson<CreditsResponse>('/billing/credits'),
  });

  const orders = useQuery({
    queryKey: ['billing', 'orders'],
    queryFn: () => getJson<Envelope<Order>>('/billing/orders'),
  });

  const paymentMethods = useQuery({
    queryKey: ['billing', 'payment-methods'],
    queryFn: () => getJson<Envelope<PaymentMethod>>('/billing/payment-methods'),
  });

  const invoices = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: () => getJson<Envelope<Invoice>>('/billing/invoices'),
    enabled: canSeeInvoices,
  });

  const redeem = useMutation({
    mutationFn: () => api.post('/billing/coupons/redeem', { code: coupon }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['billing', 'credits'] });
      setCoupon('');
      toast.success('Coupon redeemed');
    },
    onError: (error) => toast.error('Could not redeem the coupon', errorMessage(error)),
  });

  const ledgerColumns: Array<Column<CreditLedgerEntry>> = [
    {
      key: 'delta',
      header: 'Change',
      render: (row) => (
        <span
          className={
            row.delta >= 0
              ? 'font-medium text-emerald-600 dark:text-emerald-400'
              : 'font-medium text-rose-600 dark:text-rose-400'
          }
        >
          {row.delta >= 0 ? '+' : ''}
          {formatNumber(row.delta)}
        </span>
      ),
    },
    { key: 'reason', header: 'Reason', render: (row) => row.reason },
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => <span className="font-mono text-xs">{row.reference ?? '—'}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (row) => formatNumber(row.balance_after),
    },
    { key: 'created', header: 'Date', render: (row) => formatDateTime(row.created_at) },
  ];

  return (
    <>
      <PageHeader
        title="Billing"
        description="Credits, orders, and workspace invoices."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon={<ArrowLeftRight className="h-4 w-4" />}
              onClick={() => setTransferring(true)}
            >
              Transfer credits
            </Button>
            <Button icon={<ShoppingCart className="h-4 w-4" />} onClick={() => setPurchasing(true)}>
              Purchase seats
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Credit balance"
          value={formatNumber(credits.data?.balance ?? 0)}
          hint="Available to spend on courses"
          loading={credits.isLoading}
        />
        <StatTile
          label="Orders"
          value={formatNumber(orders.data?.data.length ?? 0)}
          hint="Placed from this account"
          icon={<ShoppingCart className="h-4 w-4" />}
          loading={orders.isLoading}
        />
        <StatTile
          label="Payment methods"
          value={formatNumber(paymentMethods.data?.data.length ?? 0)}
          icon={<CreditCard className="h-4 w-4" />}
          loading={paymentMethods.isLoading}
        />
        {canSeeInvoices ? (
          <StatTile
            label="Invoices"
            value={formatNumber(invoices.data?.data.length ?? 0)}
            icon={<Receipt className="h-4 w-4" />}
            loading={invoices.isLoading}
          />
        ) : null}
      </div>

      <Card>
        <CardHeader title="Redeem a coupon" description="Apply a promotional code to your account." />
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <Input
              containerClassName="min-w-[240px] flex-1"
              label="Coupon code"
              value={coupon}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              placeholder="WELCOME-2026"
            />
            <Button
              icon={<Gift className="h-4 w-4" />}
              loading={redeem.isPending}
              disabled={!coupon.trim()}
              onClick={() => redeem.mutate()}
            >
              Redeem
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Credit ledger" description="The last 100 credit movements on your account." />
        <CardContent className="p-0">
          {credits.isError ? (
            <div className="p-5">
              <ErrorState description={errorMessage(credits.error)} />
            </div>
          ) : (
            <Table
              className="rounded-none border-0 shadow-none"
              columns={ledgerColumns}
              rows={credits.data?.ledger ?? []}
              rowKey={(row, index) => `${row.created_at}-${index}`}
              loading={credits.isLoading}
              emptyTitle="No credit activity"
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Orders" />
          <CardContent className="p-0">
            <Table
              className="rounded-none border-0 shadow-none"
              columns={[
                {
                  key: 'course',
                  header: 'Course',
                  render: (row: Order) => row.course_title ?? 'Workspace credit',
                },
                {
                  key: 'total',
                  header: 'Total',
                  align: 'right',
                  render: (row: Order) => formatCurrency(row.total_cents),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row: Order) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'created',
                  header: 'Placed',
                  render: (row: Order) => formatDate(row.created_at),
                },
              ]}
              rows={orders.data?.data ?? []}
              rowKey={(row) => row.id}
              loading={orders.isLoading}
              emptyTitle="No orders yet"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Payment methods" />
          <CardContent className="space-y-3">
            {paymentMethods.isLoading ? (
              <div className="skeleton h-16 w-full" />
            ) : (paymentMethods.data?.data.length ?? 0) === 0 ? (
              <EmptyState
                title="No payment methods"
                description="Workspace administrators manage billing details."
                className="border-0 bg-transparent py-6"
              />
            ) : (
              paymentMethods.data?.data.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {method.brand} •••• {method.last4}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Expires {String(method.exp_month).padStart(2, '0')}/{method.exp_year}
                      </p>
                    </div>
                  </div>
                  {method.is_default ? <Badge tone="success">Default</Badge> : null}
                </div>
              ))
            )}
          </CardContent>
          <CardFooter>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Card details are stored by our payment provider.
            </span>
          </CardFooter>
        </Card>
      </div>

      {canSeeInvoices ? (
        <Card>
          <CardHeader title="Workspace invoices" description="Issued to your organization." />
          <CardContent className="p-0">
            <Table
              className="rounded-none border-0 shadow-none"
              columns={[
                {
                  key: 'number',
                  header: 'Invoice',
                  render: (row: Invoice) => <span className="font-mono text-xs">{row.number}</span>,
                },
                {
                  key: 'period',
                  header: 'Period',
                  render: (row: Invoice) =>
                    `${formatDate(row.period_start)} – ${formatDate(row.period_end)}`,
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  render: (row: Invoice) => formatCurrency(row.amount_cents),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row: Invoice) => <StatusBadge status={row.status} />,
                },
              ]}
              rows={invoices.data?.data ?? []}
              rowKey={(row) => row.id}
              loading={invoices.isLoading}
              emptyTitle="No invoices yet"
            />
          </CardContent>
        </Card>
      ) : null}

      <TransferModal open={transferring} onClose={() => setTransferring(false)} />
      <PurchaseModal open={purchasing} onClose={() => setPurchasing(false)} />
    </>
  );
}
