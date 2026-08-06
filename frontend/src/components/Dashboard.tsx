import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

type DashboardProps = {
  theme: 'light' | 'dark'
}

const summaryCards = [
  { label: 'Threats blocked', value: '1,482', trend: '+18%' },
  { label: 'Open incidents', value: '24', trend: '-9%' },
  { label: 'Avg. response time', value: '12m', trend: '-22%' },
  { label: 'AI suggestions', value: '8', trend: '+35%' },
]

const timelineData = [
  { name: '00:00', threats: 18 },
  { name: '03:00', threats: 28 },
  { name: '06:00', threats: 19 },
  { name: '09:00', threats: 34 },
  { name: '12:00', threats: 40 },
  { name: '15:00', threats: 31 },
  { name: '18:00', threats: 46 },
  { name: '21:00', threats: 32 },
]

const distributionData = [
  { name: 'Low', value: 42 },
  { name: 'Medium', value: 28 },
  { name: 'High', value: 18 },
  { name: 'Critical', value: 12 },
]

const securityScore = [{ name: 'Score', value: 92 }]
const COLORS = ['#22c55e', '#f97316', '#ef4444', '#a855f7']

const notifications = [
  { title: 'New phishing attempt detected', subtitle: 'A malicious email was blocked.', time: '2m ago' },
  { title: 'Suspicious login', subtitle: 'Anomalous sign-in from new location.', time: '1h ago' },
  { title: 'Recommendation ready', subtitle: 'Review AI mitigation guidance.', time: '3h ago' },
]

const recommendations = [
  { title: 'Update firewall rules', description: 'Apply latest threat intelligence to block new payloads.' },
  { title: 'Review access policies', description: 'Reduce privilege scope for external service accounts.' },
  { title: 'Enroll endpoint agents', description: 'Add 32 devices to the next security posture wave.' },
]

export default function Dashboard({ theme }: DashboardProps) {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">ThreatGuard</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Your security operations center in one place.</p>
          </div>
          <nav className="space-y-2">
            {['Overview', 'Incidents', 'Signals', 'Reports', 'AI Insights'].map(item => (
              <button key={item} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Good afternoon, security analyst</p>
                <h1 className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">Live security posture</h1>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map(card => (
                  <motion.div key={card.label} whileHover={{ y: -4 }} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{card.value}</p>
                    <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{card.trend}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Security Score</p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">92</h2>
                </div>
                <div className="h-32 w-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="70%" outerRadius="100%" data={securityScore} startAngle={180} endAngle={-180}>
                      <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={20} fill="#22c55e" />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Your current environment is secure. Continue to monitor and act on high-risk incidents.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Threat timeline</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Today</h2>
                  </div>
                </div>
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="name" stroke={theme === 'dark' ? '#cbd5e1' : '#64748b'} />
                      <YAxis stroke={theme === 'dark' ? '#cbd5e1' : '#64748b'} />
                      <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' }} />
                      <Area type="monotone" dataKey="threats" stroke="#38bdf8" fill="url(#chartGradient)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Threat distribution</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Risk levels</h2>
                  </div>
                </div>
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="name" stroke={theme === 'dark' ? '#cbd5e1' : '#64748b'} />
                      <YAxis stroke={theme === 'dark' ? '#cbd5e1' : '#64748b'} />
                      <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' }} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Latest notifications</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Alerts</h2>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {notifications.map((notification, index) => (
                    <motion.article key={notification.title} whileHover={{ y: -3 }} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{notification.title}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{notification.subtitle}</p>
                        </div>
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{notification.time}</span>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">AI recommendations</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Next actions</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-4">
                  {recommendations.map(recommendation => (
                    <motion.div key={recommendation.title} whileHover={{ scale: 1.01 }} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{recommendation.title}</p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{recommendation.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Impact timeline</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Security events</h2>
                </div>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">Stable</span>
              </div>
              <div className="mt-6 space-y-4">
                {timelineData.map(entry => (
                  <div key={entry.name} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{entry.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{entry.threats} threats detected</p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{entry.threats > 35 ? 'High' : entry.threats > 25 ? 'Medium' : 'Low'}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>
        </section>
      </motion.div>
    </div>
  )
}
