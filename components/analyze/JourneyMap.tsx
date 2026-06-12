'use client'

import type { JourneyMap as JourneyMapType, JourneyNode } from '@/types/analysis-v2'
import { JOURNEY_MAP_UNAVAILABLE, JOURNEY_NODE_STATUS_LABELS } from '@/lib/analysis/constants'

interface JourneyMapProps {
  journeyMap: JourneyMapType | null
}

function nodeClasses(status: JourneyNode['status']) {
  if (status === 'explicit') return 'border-blue-200 bg-blue-50 text-blue-950'
  if (status === 'missing') return 'border-red-200 bg-red-50 text-red-950'
  return 'border-dashed border-gray-300 bg-gray-50 text-gray-800'
}

function edgeClass(pathType: string) {
  if (pathType === 'error') return 'border-orange-300'
  if (pathType === 'missing') return 'border-dashed border-red-300'
  return 'border-teal-300'
}

export function JourneyMap({ journeyMap }: JourneyMapProps) {
  if (!journeyMap) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-950">Peta Perjalanan</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{JOURNEY_MAP_UNAVAILABLE}</p>
      </section>
    )
  }

  const edgeByTarget = new Map(journeyMap.edges.map((edge) => [edge.to, edge]))

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-gray-950">Peta Perjalanan</h2>
        <p className="mt-1 text-sm text-gray-500">{journeyMap.title}</p>
      </div>

      {journeyMap.multiFlowNote && (
        <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-600">
          {journeyMap.multiFlowNote}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {journeyMap.nodes.map((node, index) => {
          const incoming = edgeByTarget.get(node.id)
          return (
            <div key={node.id}>
              {index > 0 && (
                <div className="ml-5 flex items-center gap-2 py-1">
                  <div className={`h-5 border-l-2 ${edgeClass(incoming?.pathType ?? 'happy')}`} />
                  {incoming?.label && (
                    <span className="text-xs text-gray-400">{incoming.label}</span>
                  )}
                </div>
              )}
              <div className={`rounded-lg border p-3 ${nodeClasses(node.status)}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold">{node.label}</p>
                  <span className="text-xs font-medium text-gray-500">
                    {JOURNEY_NODE_STATUS_LABELS[node.status]}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
