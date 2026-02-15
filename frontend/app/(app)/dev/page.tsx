"use client"
import { useState } from "react"
import api from "@/services/api"

export default function DevPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [profiles, setProfiles] = useState<any[]>([])
  const [eventId, setEventId] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [proposals, setProposals] = useState<any[]>([])
  const [proposalId, setProposalId] = useState("")
  const [comment, setComment] = useState("")

  const searchProfiles = async () => {
    const params: Record<string, string> = {}
    if (email) params.email = email
    else if (name) params.name = name
    const res = await api.get("/profiles/find", { params })
    setProfiles(res.data)
  }

  const createProposal = async () => {
    const res = await api.post(`/events/${eventId}/proposals`, { file_url: fileUrl })
    await listProposals()
    setProposalId(res.data.id)
  }

  const listProposals = async () => {
    const res = await api.get(`/events/${eventId}/proposals`)
    setProposals(res.data)
  }

  const addComment = async () => {
    await api.post(`/events/${eventId}/proposals/${proposalId}/comments`, { content: comment })
  }

  const markInterviewing = async () => {
    await api.put(`/events/${eventId}/participants/me/status`, { status: "interviewing" })
  }

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <div className="font-medium">Search Profiles</div>
        <div className="flex gap-2">
          <input className="border px-2 py-1" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="border px-2 py-1" placeholder="name" value={name} onChange={e => setName(e.target.value)} />
          <button className="border px-3 py-1" onClick={searchProfiles}>Search</button>
        </div>
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border px-2">id</th>
              <th className="border px-2">full_name</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => (
              <tr key={p.id}>
                <td className="border px-2">{p.id}</td>
                <td className="border px-2">{p.full_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <div className="font-medium">Proposals</div>
        <div className="flex gap-2">
          <input className="border px-2 py-1" placeholder="event_id" value={eventId} onChange={e => setEventId(e.target.value)} />
          <input className="border px-2 py-1" placeholder="file_url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} />
          <button className="border px-3 py-1" onClick={createProposal}>Create</button>
          <button className="border px-3 py-1" onClick={listProposals}>List</button>
        </div>
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border px-2">id</th>
              <th className="border px-2">title</th>
              <th className="border px-2">file_url</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map(pr => (
              <tr key={pr.id}>
                <td className="border px-2">{pr.id}</td>
                <td className="border px-2">{pr.title}</td>
                <td className="border px-2">{pr.file_url}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2">
          <input className="border px-2 py-1" placeholder="proposal_id" value={proposalId} onChange={e => setProposalId(e.target.value)} />
          <input className="border px-2 py-1" placeholder="comment" value={comment} onChange={e => setComment(e.target.value)} />
          <button className="border px-3 py-1" onClick={addComment}>Comment</button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-medium">Interviewing</div>
        <div className="flex gap-2">
          <input className="border px-2 py-1" placeholder="event_id" value={eventId} onChange={e => setEventId(e.target.value)} />
          <button className="border px-3 py-1" onClick={markInterviewing}>Set Interviewing</button>
        </div>
      </div>
    </div>
  )
}