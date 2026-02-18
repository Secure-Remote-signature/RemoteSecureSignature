export default function docs()
{
    console.log("hello world")
    return (
        <main className="flex flex-col justify-between bg-amber-500 w-full min-h-screen">
            <div className="bg-red-700 w-full">
            <h1 className=" md:text-md pi:text-[32px]  2xl:text-[64px]">docs</h1>
            </div>
            <button className="bg-black   p-10 w-auto h-auto">
            <h1 className="text-9xl">test</h1>
            </button>
        </main>
    );
}