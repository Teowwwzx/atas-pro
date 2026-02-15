"use client"
import { Fragment, useState } from 'react'
import { Menu, Transition, Dialog } from '@headlessui/react'
import { MagicWandIcon, MagnifyingGlassIcon, LightningBoltIcon, Cross2Icon } from '@radix-ui/react-icons'
import { useRouter } from 'next/navigation'

export function AiAssistantFab() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = () => {
    if (query.trim()) {
      setIsOpen(false)
      router.push(`/experts?q=${encodeURIComponent(query)}`)
      setQuery('')
    }
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[60]">
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="flex items-center justify-center w-14 h-14 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
              <MagicWandIcon className="w-7 h-7" />
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute bottom-16 right-0 w-64 origin-bottom-right bg-white divide-y divide-gray-100 rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
              <div className="px-1 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setIsOpen(true)}
                      className={`${active ? 'bg-yellow-50 text-yellow-700' : 'text-gray-900'
                        } group flex w-full items-center rounded-lg px-3 py-3 text-sm font-medium`}
                    >
                      <MagnifyingGlassIcon className="mr-3 h-5 w-5 text-yellow-500" />
                      Search Expert Availability
                    </button>
                  )}
                </Menu.Item>
                {/* <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${active ? 'bg-gray-50' : 'text-gray-400'
                        } group flex w-full items-center rounded-lg px-3 py-3 text-sm font-medium cursor-not-allowed`}
                      disabled
                    >
                      <LightningBoltIcon className="mr-3 h-5 w-5" />
                      AI Chat (Coming Soon)
                    </button>
                  )}
                </Menu.Item> */}
                {/* <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${active ? 'bg-gray-50' : 'text-gray-400'
                        } group flex w-full items-center rounded-lg px-3 py-3 text-sm font-medium cursor-not-allowed`}
                      disabled
                    >
                      <LightningBoltIcon className="mr-3 h-5 w-5" />
                      AI Event Planner (Coming Soon)
                    </button>
                  )}
                </Menu.Item> */}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all">
                  <div className="flex justify-between items-center mb-5">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-bold leading-6 text-gray-900 flex items-center gap-2"
                    >
                      <MagicWandIcon className="w-5 h-5 text-yellow-500" />
                      AI Availability Search
                    </Dialog.Title>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <Cross2Icon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-4 font-medium">
                      Tell us when you need an expert. Our AI will match you with professionals available at your specific times.
                    </p>
                    <textarea
                      className="w-full p-4 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none transition-all shadow-sm text-base"
                      rows={3}
                      placeholder="e.g. I need someone for a panel discussion on Saturday night after 8pm..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSearch()
                        }
                      }}
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-xl border border-transparent bg-yellow-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 transition-colors shadow-sm"
                      onClick={handleSearch}
                    >
                      Find Experts
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}